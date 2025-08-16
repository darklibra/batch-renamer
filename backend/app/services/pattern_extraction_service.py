import re
import json
import uuid
import time
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from pathlib import Path
import logging

from app.models.file_models import IndexedFile, ExtractionPattern, PatternApplication, PatternFailure, PatternExtractionJob
from app.repositories.file_repository import FileRepository
from app.repositories.pattern_repository import PatternRepository, PatternApplicationRepository, PatternFailureRepository, PatternExtractionJobRepository

# Import new optimization modules
from app.core.pattern_cache import get_pattern_cache
from app.core.security_validator import get_pattern_validator
from app.core.async_processor import AsyncBatchProcessor, ProcessingConfig, ProcessingStrategy, process_files_parallel

logger = logging.getLogger(__name__)


class PatternExtractionService:
    """
    Enhanced service for intelligent pattern extraction with caching, security, and parallel processing
    """
    
    def __init__(
        self,
        file_repository: FileRepository,
        pattern_repository: PatternRepository,
        application_repository: PatternApplicationRepository,
        failure_repository: PatternFailureRepository,
        job_repository: PatternExtractionJobRepository,
        selection_history_repository=None  # Optional for backward compatibility
    ):
        self.file_repo = file_repository
        self.pattern_repo = pattern_repository
        self.application_repo = application_repository
        self.failure_repo = failure_repository
        self.job_repo = job_repository
        self.selection_history_repo = selection_history_repository
        
        # Initialize optimization components
        self.pattern_cache = get_pattern_cache()
        self.security_validator = get_pattern_validator()
        
        # Performance tracking
        self._performance_stats = {
            'cache_hits': 0,
            'cache_misses': 0,
            'patterns_validated': 0,
            'extractions_performed': 0,
            'average_extraction_time_ms': 0.0
        }
        
        logger.info("PatternExtractionService initialized with optimizations enabled")

    def extract_metadata_from_filename(
        self, 
        filename: str, 
        patterns: List[ExtractionPattern] = None
    ) -> Tuple[Optional[Dict], Optional[ExtractionPattern], int]:
        """
        Extract metadata from filename using best-match pattern algorithm
        
        Returns:
            - extracted_data: Dict with extracted metadata or None
            - best_pattern: Matched pattern or None
            - extraction_score: Number of successfully extracted fields
        """
        if patterns is None:
            patterns = self.pattern_repo.get_active_patterns()
        
        if not patterns:
            return None, None, 0
        
        # Sort patterns by priority (higher priority first)
        sorted_patterns = sorted(patterns, key=lambda p: p.priority, reverse=True)
        
        best_match = None
        best_pattern = None
        best_score = 0
        
        for pattern in sorted_patterns:
            try:
                extracted_data, score = self._apply_single_pattern(filename, pattern)
                
                if score > best_score:
                    best_match = extracted_data
                    best_pattern = pattern
                    best_score = score
                    
                # If we get a perfect match, stop searching
                if score == len(pattern.field_mapping):
                    break
                    
            except Exception as e:
                # Log pattern application error but continue with other patterns
                print(f"Error applying pattern {pattern.id} to {filename}: {str(e)}")
                continue
        
        return best_match, best_pattern, best_score

    def _apply_single_pattern(
        self, 
        filename: str, 
        pattern: ExtractionPattern
    ) -> Tuple[Optional[Dict], int]:
        """
        Apply a single pattern to extract metadata from filename with caching
        
        Returns:
            - extracted_data: Dict with extracted fields
            - extraction_score: Number of successfully extracted fields
        """
        start_time = time.perf_counter()
        
        try:
            # Get compiled pattern from cache (major performance improvement)
            try:
                compiled_pattern = self.pattern_cache.get_compiled_pattern(
                    pattern.id, pattern.regex_pattern
                )
                self._performance_stats['cache_hits'] += 1
            except Exception as e:
                logger.error(f"Pattern compilation failed for pattern {pattern.id}: {str(e)}")
                self._performance_stats['cache_misses'] += 1
                raise ValueError(f"Pattern compilation error: {str(e)}")
            
            # Apply cached compiled pattern
            match = compiled_pattern.match(filename)
            if not match:
                return None, 0
            
            # Extract field mapping
            field_mapping = pattern.field_mapping
            if isinstance(field_mapping, str):
                field_mapping = json.loads(field_mapping)
            
            extracted_data = {}
            successful_extractions = 0
            
            # Process each field mapping
            for field_name, field_config in field_mapping.items():
                try:
                    # Parse field configuration (e.g., "$1:s$" -> group 1, string type)
                    if isinstance(field_config, str) and field_config.startswith('$') and field_config.endswith('$'):
                        # Parse format: $group:type$
                        config_parts = field_config[1:-1].split(':')
                        group_num = int(config_parts[0])
                        field_type = config_parts[1] if len(config_parts) > 1 else 's'
                        
                        # Extract value from regex group
                        if group_num < len(match.groups()) + 1:  # +1 because group(0) is full match
                            raw_value = match.group(group_num) if group_num > 0 else match.group(0)
                            
                            # Convert to appropriate type with enhanced conversion
                            converted_value = self._convert_field_type_enhanced(raw_value, field_type)
                            extracted_data[field_name] = converted_value
                            successful_extractions += 1
                    else:
                        # Static value or unsupported format
                        extracted_data[field_name] = field_config
                        successful_extractions += 1
                        
                except (IndexError, ValueError, TypeError) as e:
                    # Field extraction failed, skip this field
                    logger.debug(f"Failed to extract field {field_name} from pattern {pattern.id}: {str(e)}")
                    continue
            
            # Update performance stats
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            self._performance_stats['extractions_performed'] += 1
            
            # Update rolling average
            current_avg = self._performance_stats['average_extraction_time_ms']
            count = self._performance_stats['extractions_performed']
            self._performance_stats['average_extraction_time_ms'] = (
                (current_avg * (count - 1) + processing_time_ms) / count
            )
            
            return extracted_data if successful_extractions > 0 else None, successful_extractions
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid field mapping JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Pattern application failed for pattern {pattern.id}: {str(e)}")
            raise RuntimeError(f"Pattern application failed: {str(e)}")

    def _convert_field_type_enhanced(self, value: str, field_type: str) -> Any:
        """
        Enhanced field type conversion with more formats and validation
        
        Supported types:
        - 's': string (default)
        - 'd': integer
        - 'f': float
        - 'b': boolean
        - 'date': datetime
        - 'time': time
        - 'url': URL validation
        - 'email': email validation
        - 'phone': phone number
        - 'trim': trimmed string
        - 'upper': uppercase string
        - 'lower': lowercase string
        """
        if not value:
            return value if field_type == 's' else None
            
        try:
            if field_type == 's':
                return value
            elif field_type == 'd':
                # Handle common number formats
                clean_value = value.replace(',', '').replace(' ', '')
                return int(clean_value)
            elif field_type == 'f':
                # Handle common float formats
                clean_value = value.replace(',', '').replace(' ', '')
                return float(clean_value)
            elif field_type == 'b':
                return value.lower().strip() in ('true', '1', 'yes', 'on', 'y', 'enabled', 'active')
            elif field_type == 'date':
                # Extended date format support
                date_formats = [
                    '%Y-%m-%d', '%Y%m%d', '%d-%m-%Y', '%m-%d-%Y',
                    '%Y.%m.%d', '%d.%m.%Y', '%Y/%m/%d', '%d/%m/%Y',
                    '%b %d, %Y', '%d %b %Y', '%B %d, %Y', '%d %B %Y',
                    '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'
                ]
                
                for date_format in date_formats:
                    try:
                        return datetime.strptime(value.strip(), date_format)
                    except ValueError:
                        continue
                        
                # Try parsing with dateutil as fallback
                try:
                    from dateutil import parser
                    return parser.parse(value.strip())
                except ImportError:
                    pass
                except Exception:
                    pass
                    
                raise ValueError(f"Could not parse date: {value}")
            
            elif field_type == 'time':
                # Time parsing
                time_formats = ['%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M:%S %p']
                for time_format in time_formats:
                    try:
                        return datetime.strptime(value.strip(), time_format).time()
                    except ValueError:
                        continue
                raise ValueError(f"Could not parse time: {value}")
            
            elif field_type == 'url':
                # Basic URL validation
                if value.startswith(('http://', 'https://', 'ftp://')):
                    return value.strip()
                return f"http://{value.strip()}"
            
            elif field_type == 'email':
                # Basic email validation
                email = value.strip().lower()
                if '@' in email and '.' in email.split('@')[1]:
                    return email
                raise ValueError(f"Invalid email format: {value}")
            
            elif field_type == 'phone':
                # Phone number normalization
                import re
                phone = re.sub(r'[^0-9+]', '', value)
                return phone if len(phone) >= 10 else value
            
            elif field_type == 'trim':
                return value.strip()
            elif field_type == 'upper':
                return value.upper().strip()
            elif field_type == 'lower':
                return value.lower().strip()
            else:
                # Unknown type, return as string
                logger.debug(f"Unknown field type '{field_type}', returning as string")
                return value
                
        except (ValueError, TypeError) as e:
            logger.debug(f"Type conversion failed for '{value}' to '{field_type}': {str(e)}")
            # Conversion failed, return original string
            return value
        except Exception as e:
            logger.warning(f"Unexpected error in type conversion: {str(e)}")
            return value

    def apply_pattern_to_file(self, file_obj, pattern) -> Dict[str, Any]:
        """
        Apply a specific pattern to a file and return extracted metadata
        
        Args:
            file_obj: IndexedFile object
            pattern: ExtractionPattern object
            
        Returns:
            Dict with extracted metadata
            
        Raises:
            ValueError: If pattern doesn't match or extraction fails
        """
        try:
            extracted_data, score = self._apply_single_pattern(
                file_obj.filename, pattern
            )
            
            if not extracted_data:
                raise ValueError(f"Pattern '{pattern.name}' does not match file '{file_obj.filename}'")
            
            return extracted_data
            
        except Exception as e:
            raise ValueError(f"Failed to apply pattern '{pattern.name}' to file '{file_obj.filename}': {str(e)}")

    async def extract_metadata_for_file(self, file_id: int, force_reapply: bool = False) -> Dict:
        """
        Extract metadata for a specific file and save results
        
        Returns:
            - success: boolean
            - extracted_data: Dict with extracted metadata
            - pattern_id: ID of matched pattern
            - extraction_score: Number of extracted fields
            - error: Error message if failed
        """
        start_time = time.time()
        
        try:
            # Get file information
            file_record = self.file_repo.get_file_by_id(file_id)
            if not file_record:
                return {
                    'success': False,
                    'error': f'File with ID {file_id} not found'
                }
            
            # Check if already processed and not forcing reapply
            if not force_reapply:
                existing_application = self.application_repo.get_current_application_for_file(file_id)
                if existing_application:
                    return {
                        'success': True,
                        'extracted_data': existing_application.extracted_data,
                        'pattern_id': existing_application.pattern_id,
                        'extraction_score': existing_application.extraction_score,
                        'already_processed': True
                    }
            
            # Extract metadata from filename
            extracted_data, matched_pattern, extraction_score = self.extract_metadata_from_filename(
                file_record.filename
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            if extracted_data and matched_pattern:
                # Mark previous applications as not current
                self.application_repo.mark_previous_applications_as_old(file_id)
                
                # Save successful extraction
                application = self.application_repo.create_application({
                    'file_id': file_id,
                    'pattern_id': matched_pattern.id,
                    'extraction_score': extraction_score,
                    'extracted_data': extracted_data,
                    'is_current': True,
                    'processing_time_ms': processing_time
                })
                
                # Update file record with extracted data
                self.file_repo.update_file_extracted_data(file_id, extracted_data, matched_pattern.id)
                
                return {
                    'success': True,
                    'extracted_data': extracted_data,
                    'pattern_id': matched_pattern.id,
                    'extraction_score': extraction_score,
                    'processing_time_ms': processing_time
                }
            else:
                # No pattern matched, record failure
                attempted_patterns = [p.id for p in self.pattern_repo.get_active_patterns()]
                
                failure = self.failure_repo.create_failure({
                    'file_id': file_id,
                    'attempted_patterns': attempted_patterns,
                    'failure_reason': 'No pattern matched filename',
                    'error_details': {
                        'filename': file_record.filename,
                        'patterns_tried': len(attempted_patterns),
                        'processing_time_ms': processing_time
                    },
                    'requires_user_input': True
                })
                
                return {
                    'success': False,
                    'error': 'No pattern matched filename',
                    'attempted_patterns': attempted_patterns,
                    'failure_id': failure.id,
                    'requires_user_input': True
                }
                
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            
            # Record critical failure
            self.failure_repo.create_failure({
                'file_id': file_id,
                'attempted_patterns': [],
                'failure_reason': f'Critical error: {str(e)}',
                'error_details': {
                    'exception_type': type(e).__name__,
                    'exception_message': str(e),
                    'processing_time_ms': processing_time
                },
                'requires_user_input': False  # System error, not user issue
            })
            
            return {
                'success': False,
                'error': f'Critical error during extraction: {str(e)}',
                'exception_type': type(e).__name__
            }

    async def batch_extract_metadata(
        self, 
        file_ids: List[int], 
        pattern_ids: List[int] = None,
        force_reapply: bool = False,
        max_concurrency: int = None
    ) -> str:
        """
        Enhanced batch metadata extraction with parallel processing
        
        Args:
            file_ids: List of file IDs to process
            pattern_ids: Specific patterns to use (optional)
            force_reapply: Force reprocess already processed files
            max_concurrency: Override default concurrency limit
        
        Returns:
            job_id: UUID of the background job
        """
        job_id = str(uuid.uuid4())
        
        # Determine optimal concurrency based on workload
        if max_concurrency is None:
            if len(file_ids) < 50:
                max_concurrency = 5
            elif len(file_ids) < 200:
                max_concurrency = 10
            else:
                max_concurrency = 20
        
        logger.info(
            f"Starting enhanced batch extraction job {job_id}: "
            f"{len(file_ids)} files, concurrency={max_concurrency}"
        )
        
        # Create job record with enhanced metadata
        job_data = {
            'id': job_id,
            'job_type': 'batch_extract',
            'file_ids': file_ids,
            'pattern_ids': pattern_ids or [],
            'status': 'started',
            'total_count': len(file_ids),
            'processed_count': 0,
            'successful_extractions': 0,
            'failed_extractions': 0,
            'metadata': {
                'max_concurrency': max_concurrency,
                'force_reapply': force_reapply,
                'optimization_enabled': True
            }
        }
        
        self.job_repo.create_job(job_data)
        
        # Start enhanced background processing
        asyncio.create_task(
            self._process_batch_extraction_job_enhanced(
                job_id, file_ids, force_reapply, max_concurrency
            )
        )
        
        return job_id

    async def _process_batch_extraction_job_enhanced(
        self, 
        job_id: str, 
        file_ids: List[int], 
        force_reapply: bool = False,
        max_concurrency: int = 10
    ):
        """
        Enhanced background task for batch metadata extraction with parallel processing
        """
        start_time = time.perf_counter()
        
        try:
            logger.info(f"Starting enhanced batch processing for job {job_id}")
            
            # Update job status
            self.job_repo.update_job_progress(job_id, {
                'status': 'processing',
                'started_processing_at': datetime.utcnow()
            })
            
            # Progress callback for job updates
            def update_progress(completed: int, total: int):
                try:
                    self.job_repo.update_job_progress(job_id, {
                        'processed_count': completed
                    })
                except Exception as e:
                    logger.error(f"Progress update failed: {str(e)}")
            
            # Use enhanced parallel processing
            processor_func = lambda file_id: self.extract_metadata_for_file(file_id, force_reapply)
            
            # Configure processing strategy based on workload
            config = ProcessingConfig(
                max_concurrency=max_concurrency,
                timeout_seconds=60.0,
                strategy=ProcessingStrategy.ADAPTIVE,
                retry_attempts=1,
                backoff_factor=1.5,
                progress_callback=update_progress
            )
            
            processor = AsyncBatchProcessor[int, Dict](config)
            batch_result = await processor.process_batch(
                file_ids, processor_func, "file"
            )
            
            # Process results and calculate statistics
            successful_extractions = batch_result.successful_items
            failed_extractions = batch_result.failed_items
            processing_time = time.perf_counter() - start_time
            
            # Prepare result data
            results = []
            for processing_result in batch_result.results:
                if processing_result.success and processing_result.result:
                    result_data = processing_result.result
                    results.append({
                        'file_id': processing_result.metadata.get('index'),
                        'success': True,
                        'extracted_data': result_data.get('extracted_data'),
                        'pattern_id': result_data.get('pattern_id'),
                        'processing_time_ms': processing_result.processing_time_ms
                    })
                else:
                    results.append({
                        'file_id': processing_result.metadata.get('index'),
                        'success': False,
                        'error': processing_result.error,
                        'processing_time_ms': processing_result.processing_time_ms
                    })
            
            # Enhanced job completion data
            completion_data = {
                'status': 'completed',
                'successful_extractions': successful_extractions,
                'failed_extractions': failed_extractions,
                'processing_time_seconds': processing_time,
                'throughput_files_per_second': batch_result.throughput_items_per_second,
                'result_data': {
                    'summary': {
                        'total_processed': len(file_ids),
                        'successful': successful_extractions,
                        'failed': failed_extractions,
                        'success_rate': (successful_extractions / len(file_ids) * 100) if file_ids else 0,
                        'average_processing_time_ms': batch_result.average_item_time_ms,
                        'total_processing_time_ms': batch_result.total_processing_time_ms,
                        'throughput_files_per_second': batch_result.throughput_items_per_second
                    },
                    'performance_metrics': {
                        'strategy_used': batch_result.metadata.get('strategy_used'),
                        'concurrency_level': batch_result.metadata.get('concurrency_level'),
                        'batch_size': batch_result.metadata.get('batch_size'),
                        'cache_performance': self.pattern_cache.get_cache_info()['stats'] if hasattr(self, 'pattern_cache') else None
                    },
                    'results': results[:100]  # Limit stored results for large batches
                },
                'completed_at': datetime.utcnow()
            }
            
            self.job_repo.update_job_progress(job_id, completion_data)
            
            logger.info(
                f"Enhanced batch job {job_id} completed successfully: "
                f"{successful_extractions}/{len(file_ids)} successful "
                f"in {processing_time:.2f}s ({batch_result.throughput_items_per_second:.1f} files/sec)"
            )
            
        except Exception as e:
            processing_time = time.perf_counter() - start_time
            error_msg = f'Enhanced batch extraction job failed: {str(e)}'
            
            logger.error(f"Job {job_id} failed after {processing_time:.2f}s: {error_msg}")
            
            # Job failed with enhanced error reporting
            self.job_repo.update_job_progress(job_id, {
                'status': 'error',
                'error_message': error_msg,
                'processing_time_seconds': processing_time,
                'completed_at': datetime.utcnow(),
                'error_details': {
                    'exception_type': type(e).__name__,
                    'traceback': str(e)
                }
            })

    def test_pattern_against_files(
        self, 
        pattern_data: Dict, 
        file_ids: List[int]
    ) -> Dict:
        """
        Enhanced pattern testing with security validation and performance metrics
        
        Args:
            pattern_data: Dict with pattern information (name, regex_pattern, field_mapping)
            file_ids: List of file IDs to test against
            
        Returns:
            Dict with test results for each file
        """
        start_time = time.perf_counter()
        
        try:
            # Security validation first
            security_result = self.security_validator.validate_pattern_security(
                pattern_data['regex_pattern']
            )
            
            if not security_result.is_valid:
                return {
                    'success': False,
                    'error': f'Pattern security validation failed: {security_result.message}',
                    'security_details': {
                        'risk_score': security_result.risk_score,
                        'details': security_result.details
                    },
                    'results': {}
                }
            
            # Create temporary pattern object with enhanced metadata
            temp_pattern = ExtractionPattern()
            temp_pattern.id = -1  # Temporary pattern ID for caching
            temp_pattern.name = pattern_data['name']
            temp_pattern.regex_pattern = pattern_data['regex_pattern']
            temp_pattern.field_mapping = pattern_data['field_mapping']
            temp_pattern.priority = 1
            
            results = {}
            total_processing_time = 0.0
            successful_matches = 0
            
            # Test against each file with performance tracking
            for file_id in file_ids:
                file_start = time.perf_counter()
                
                file_record = self.file_repo.get_file_by_id(file_id)
                if not file_record:
                    results[file_id] = {
                        'success': False,
                        'error': 'File not found',
                        'filename': 'N/A',
                        'processing_time_ms': 0.0
                    }
                    continue
                
                try:
                    # Apply pattern with caching enabled
                    extracted_data, score = self._apply_single_pattern(file_record.filename, temp_pattern)
                    processing_time = (time.perf_counter() - file_start) * 1000
                    total_processing_time += processing_time
                    
                    is_match = extracted_data is not None
                    if is_match:
                        successful_matches += 1
                    
                    results[file_id] = {
                        'success': True,
                        'filename': file_record.filename,
                        'extracted_data': extracted_data,
                        'extraction_score': score,
                        'matched': is_match,
                        'processing_time_ms': round(processing_time, 2)
                    }
                    
                except Exception as e:
                    processing_time = (time.perf_counter() - file_start) * 1000
                    total_processing_time += processing_time
                    
                    results[file_id] = {
                        'success': False,
                        'filename': file_record.filename,
                        'error': str(e),
                        'processing_time_ms': round(processing_time, 2)
                    }
            
            total_test_time = (time.perf_counter() - start_time) * 1000
            
            return {
                'success': True,
                'pattern_name': pattern_data['name'],
                'total_files_tested': len(file_ids),
                'successful_matches': successful_matches,
                'match_rate_percent': round((successful_matches / len(file_ids)) * 100, 2) if file_ids else 0,
                'performance_metrics': {
                    'total_test_time_ms': round(total_test_time, 2),
                    'average_file_time_ms': round(total_processing_time / len(file_ids), 2) if file_ids else 0,
                    'files_per_second': round(len(file_ids) / (total_test_time / 1000), 2) if total_test_time > 0 else 0
                },
                'security_validation': {
                    'passed': True,
                    'risk_score': security_result.risk_score,
                    'complexity_score': security_result.details.get('complexity_score') if security_result.details else None
                },
                'results': results
            }
            
        except Exception as e:
            total_test_time = (time.perf_counter() - start_time) * 1000
            logger.error(f"Pattern test failed after {total_test_time:.2f}ms: {str(e)}")
            
            return {
                'success': False,
                'error': f'Pattern test failed: {str(e)}',
                'processing_time_ms': round(total_test_time, 2),
                'results': {}
            }

    def get_extraction_failures(
        self, 
        limit: int = 50, 
        requires_user_input: bool = None
    ) -> List[Dict]:
        """
        Get files that failed pattern extraction
        """
        return self.failure_repo.get_failures_paginated(
            limit=limit,
            requires_user_input=requires_user_input
        )

    def resolve_extraction_failure(
        self, 
        failure_id: int, 
        pattern_id: int
    ) -> Dict:
        """
        Resolve a pattern extraction failure by applying a specific pattern
        """
        try:
            failure = self.failure_repo.get_failure_by_id(failure_id)
            if not failure:
                return {
                    'success': False,
                    'error': 'Failure record not found'
                }
            
            # Extract metadata using specific pattern
            pattern = self.pattern_repo.get_pattern_by_id(pattern_id)
            if not pattern:
                return {
                    'success': False,
                    'error': 'Pattern not found'
                }
            
            file_record = self.file_repo.get_file_by_id(failure.file_id)
            extracted_data, score = self._apply_single_pattern(file_record.filename, pattern)
            
            if extracted_data:
                # Mark previous applications as not current
                self.application_repo.mark_previous_applications_as_old(failure.file_id)
                
                # Create successful application
                self.application_repo.create_application({
                    'file_id': failure.file_id,
                    'pattern_id': pattern_id,
                    'extraction_score': score,
                    'extracted_data': extracted_data,
                    'is_current': True
                })
                
                # Update file with extracted data
                self.file_repo.update_file_extracted_data(failure.file_id, extracted_data, pattern_id)
                
                # Mark failure as resolved
                self.failure_repo.resolve_failure(failure_id, pattern_id)
                
                return {
                    'success': True,
                    'extracted_data': extracted_data,
                    'extraction_score': score
                }
            else:
                return {
                    'success': False,
                    'error': 'Pattern still does not match this filename'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to resolve extraction failure: {str(e)}'
            }

    def get_job_progress(self, job_id: str) -> Optional[Dict]:
        """
        Get progress information for a background job
        """
        job = self.job_repo.get_job_by_id(job_id)
        return job.to_dict() if job else None

    def get_pattern_performance_stats(self, pattern_id: int) -> Dict:
        """
        Get performance statistics for a specific pattern
        """
        # Get basic pattern performance stats
        basic_stats = self.application_repo.get_pattern_performance_stats(pattern_id)
        
        # Add cache-specific stats if available
        if hasattr(self, 'pattern_cache'):
            cache_stats = self.pattern_cache.get_pattern_stats(pattern_id)
            if cache_stats:
                basic_stats.update({
                    'cache_performance': cache_stats
                })
        
        return basic_stats

    def get_extraction_overview(self) -> Dict:
        """
        Enhanced extraction statistics with performance metrics
        """
        # Get basic statistics
        basic_stats = {
            'total_files': self.file_repo.get_file_count(),
            'files_with_extractions': self.application_repo.get_files_with_extractions_count(),
            'total_applications': self.application_repo.get_total_applications_count(),
            'total_failures': self.failure_repo.get_total_failures_count(),
            'active_patterns': len(self.pattern_repo.get_active_patterns()),
            'recent_jobs': self.job_repo.get_recent_jobs(limit=5)
        }
        
        # Add performance statistics
        performance_stats = self._performance_stats.copy()
        
        # Calculate cache efficiency
        cache_total = performance_stats['cache_hits'] + performance_stats['cache_misses']
        cache_hit_rate = (performance_stats['cache_hits'] / cache_total * 100) if cache_total > 0 else 0.0
        
        # Get cache information
        cache_info = self.pattern_cache.get_cache_info() if hasattr(self, 'pattern_cache') else None
        
        return {
            **basic_stats,
            'performance_metrics': {
                'extractions_performed': performance_stats['extractions_performed'],
                'average_extraction_time_ms': round(performance_stats['average_extraction_time_ms'], 2),
                'cache_hit_rate_percent': round(cache_hit_rate, 2),
                'patterns_validated': performance_stats['patterns_validated']
            },
            'cache_statistics': cache_info['stats'] if cache_info else None,
            'optimization_status': {
                'caching_enabled': hasattr(self, 'pattern_cache'),
                'security_validation_enabled': hasattr(self, 'security_validator'),
                'parallel_processing_enabled': True
            }
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get detailed performance metrics
        """
        cache_info = self.pattern_cache.get_cache_info() if hasattr(self, 'pattern_cache') else None
        
        return {
            'extraction_performance': self._performance_stats.copy(),
            'cache_performance': cache_info if cache_info else {'error': 'Cache not available'},
            'security_validation_stats': (
                self.security_validator.get_cache_stats() 
                if hasattr(self, 'security_validator') else {'error': 'Security validator not available'}
            )
        }
    
    def cleanup_caches(self) -> Dict[str, str]:
        """
        Clean up all caches and reset performance counters
        """
        cleanup_results = {}
        
        # Clear pattern cache
        if hasattr(self, 'pattern_cache'):
            try:
                self.pattern_cache.cleanup_expired_patterns()
                cleanup_results['pattern_cache'] = 'expired patterns cleaned'
            except Exception as e:
                cleanup_results['pattern_cache'] = f'cleanup error: {str(e)}'
        
        # Clear security validation cache
        if hasattr(self, 'security_validator'):
            try:
                self.security_validator.clear_cache()
                cleanup_results['security_cache'] = 'validation cache cleared'
            except Exception as e:
                cleanup_results['security_cache'] = f'cleanup error: {str(e)}'
        
        # Reset performance stats
        self._performance_stats = {
            'cache_hits': 0,
            'cache_misses': 0,
            'patterns_validated': 0,
            'extractions_performed': 0,
            'average_extraction_time_ms': 0.0
        }
        
        cleanup_results['performance_stats'] = 'reset'
        
        logger.info(f"Cache cleanup completed: {cleanup_results}")
        return cleanup_results
    
    def invalidate_pattern_caches(self, pattern_id: int) -> Dict[str, str]:
        """
        Invalidate caches for a specific pattern (useful when pattern is updated)
        """
        results = {}
        
        # Invalidate pattern compilation cache
        if hasattr(self, 'pattern_cache'):
            try:
                self.pattern_cache.invalidate_pattern(pattern_id)
                results['pattern_cache'] = f'pattern {pattern_id} cache invalidated'
            except Exception as e:
                results['pattern_cache'] = f'invalidation error: {str(e)}'
        
        logger.info(f"Pattern {pattern_id} cache invalidation: {results}")
        return results
    
    def validate_pattern_security(self, pattern: str, pattern_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Validate pattern security and return detailed results
        """
        if hasattr(self, 'security_validator'):
            try:
                result = self.security_validator.validate_pattern_security(pattern, pattern_id)
                self._performance_stats['patterns_validated'] += 1
                
                return {
                    'is_valid': result.is_valid,
                    'message': result.message,
                    'risk_score': result.risk_score,
                    'details': result.details
                }
            except Exception as e:
                logger.error(f"Security validation failed: {str(e)}")
                return {
                    'is_valid': False,
                    'message': f'Validation error: {str(e)}',
                    'risk_score': 1.0,
                    'details': {'error': str(e)}
                }
        else:
            return {
                'is_valid': True,
                'message': 'Security validation disabled',
                'risk_score': 0.0,
                'details': {'note': 'Security validator not available'}
            }
    
    def get_extraction_overview(self) -> Dict[str, Any]:
        """
        Get comprehensive overview of extraction statistics for dashboard
        """
        try:
            # Get file statistics
            total_files = self.file_repo.get_file_count()
            files_with_metadata = self.file_repo.get_files_with_metadata_count()
            
            # Get pattern statistics  
            total_patterns = self.pattern_repo.get_pattern_count()
            active_patterns = self.pattern_repo.get_active_pattern_count()
            
            # Get application statistics
            total_applications = self.application_repo.get_total_applications_count()
            successful_applications = self.application_repo.get_successful_applications_count()
            
            # Get failure statistics
            total_failures = self.failure_repo.get_total_failures_count()
            unresolved_failures = self.failure_repo.get_unresolved_failures_count()
            
            # Calculate percentages
            extraction_success_rate = 0.0
            if total_files > 0:
                extraction_success_rate = round((files_with_metadata / total_files) * 100, 2)
            
            application_success_rate = 0.0
            if total_applications > 0:
                application_success_rate = round((successful_applications / total_applications) * 100, 2)
            
            return {
                'total_files': total_files,
                'files_with_metadata': files_with_metadata,
                'total_patterns': total_patterns, 
                'active_patterns': active_patterns,
                'total_applications': total_applications,
                'successful_applications': successful_applications,
                'total_failures': total_failures,
                'unresolved_failures': unresolved_failures,
                'extraction_success_rate': extraction_success_rate,
                'application_success_rate': application_success_rate,
                'performance_stats': self._performance_stats.copy()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate extraction overview: {str(e)}")
            raise Exception(f"Failed to get extraction overview: {str(e)}")

    async def analyze_pattern_effectiveness_for_files(
        self,
        pattern_id: int,
        file_filters: Dict = None,
        limit: int = 100,
        quality_threshold: int = 70,
        exclude_previously_selected: bool = True,
        force_include_all: bool = False
    ) -> Dict:
        """
        Analyze files and rank by pattern extraction effectiveness for auto file selection
        
        Args:
            pattern_id: Pattern to analyze
            file_filters: Optional filters for file selection
            limit: Maximum number of files to analyze
            quality_threshold: Minimum quality score for recommendations
            exclude_previously_selected: Whether to exclude previously selected files
            force_include_all: Force include all files regardless of history
            
        Returns:
            Dict with ranked files, recommendations, and statistics
        """
        import time
        start_time = time.perf_counter()
        
        try:
            # Get the pattern
            pattern = self.pattern_repo.get_pattern_by_id(pattern_id)
            if not pattern:
                raise ValueError(f"Pattern with ID {pattern_id} not found")
            
            # Get files for analysis with filters
            files_to_analyze = self._get_files_for_analysis(file_filters, limit)
            
            if not files_to_analyze:
                return {
                    "analyzed_files": 0,
                    "ranked_files": [],
                    "recommendations": {
                        "optimal_file_count": 0,
                        "quality_threshold": quality_threshold,
                        "message": "No files found for analysis"
                    }
                }
            
            # Apply selection history exclusion logic
            excluded_count = 0
            if exclude_previously_selected and not force_include_all and self.selection_history_repo:
                try:
                    # Get previously selected file IDs for this pattern
                    previously_selected_ids = self.selection_history_repo.get_previously_selected_files(pattern_id)
                    
                    if previously_selected_ids:
                        # Filter out previously selected files
                        original_count = len(files_to_analyze)
                        files_to_analyze = [f for f in files_to_analyze if f.id not in previously_selected_ids]
                        excluded_count = original_count - len(files_to_analyze)
                        
                        logger.info(f"Excluded {excluded_count} previously selected files for pattern {pattern_id}")
                except Exception as e:
                    logger.warning(f"Failed to apply selection history exclusion: {str(e)}")
                    # Continue without exclusion if history lookup fails
            
            if not files_to_analyze:
                return {
                    "analyzed_files": 0,
                    "ranked_files": [],
                    "excluded_files": excluded_count,
                    "recommendations": {
                        "optimal_file_count": 0,
                        "quality_threshold": quality_threshold,
                        "message": f"No new files to analyze. {excluded_count} files were previously selected." if excluded_count > 0 else "No files found for analysis"
                    }
                }
            
            # Analyze each file with the pattern
            scored_files = []
            total_analyzed = 0
            
            for file_obj in files_to_analyze:
                try:
                    # Apply pattern and calculate score
                    extracted_data, extraction_score = self._apply_single_pattern(
                        file_obj.filename, pattern
                    )
                    
                    # Calculate additional metrics
                    extracted_fields = len(extracted_data) if extracted_data else 0
                    
                    # Calculate confidence based on pattern complexity and match quality
                    confidence = self._calculate_pattern_confidence(
                        pattern, file_obj.filename, extracted_data, extraction_score
                    )
                    
                    # Create file score entry
                    file_score = {
                        "file_id": file_obj.id,
                        "filename": file_obj.filename,
                        "full_path": file_obj.full_path,
                        "extraction_score": extraction_score * 10,  # Scale to 0-100
                        "extracted_fields": extracted_fields,
                        "potential_data": extracted_data or {},
                        "confidence": confidence
                    }
                    
                    scored_files.append(file_score)
                    total_analyzed += 1
                    
                except Exception as e:
                    logger.debug(f"Failed to analyze file {file_obj.filename} with pattern {pattern.name}: {str(e)}")
                    continue
            
            # Sort by composite score (extraction_score * confidence)
            scored_files.sort(
                key=lambda x: (x["extraction_score"] * x["confidence"]), 
                reverse=True
            )
            
            # Generate recommendations
            recommendations = self._generate_file_selection_recommendations(
                scored_files, quality_threshold
            )
            
            processing_time = time.perf_counter() - start_time
            logger.info(
                f"Pattern effectiveness analysis completed: "
                f"{total_analyzed} files analyzed in {processing_time:.2f}s"
            )
            
            return {
                "analyzed_files": total_analyzed,
                "ranked_files": scored_files,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Pattern effectiveness analysis failed: {str(e)}")
            raise Exception(f"Failed to analyze pattern effectiveness: {str(e)}")

    def _get_files_for_analysis(self, file_filters: Dict = None, limit: int = 100) -> List:
        """Get files for pattern analysis with optional filters"""
        try:
            # Build query filters
            filters = {}
            if file_filters:
                # Apply extension filter
                if "extensions" in file_filters:
                    filters["extensions"] = file_filters["extensions"]
                
                # Apply path filter  
                if "path_contains" in file_filters:
                    filters["path_contains"] = file_filters["path_contains"]
                
                # Apply size filter
                if "min_size" in file_filters or "max_size" in file_filters:
                    filters["size_range"] = (
                        file_filters.get("min_size", 0),
                        file_filters.get("max_size", float('inf'))
                    )
            
            # Get files from repository
            files = self.file_repo.get_files_paginated(
                page=1,
                per_page=limit,
                filters=filters
            )
            
            return files.get("files", [])
            
        except Exception as e:
            logger.error(f"Failed to get files for analysis: {str(e)}")
            return []

    def _calculate_pattern_confidence(
        self, 
        pattern, 
        filename: str, 
        extracted_data: Dict, 
        extraction_score: int
    ) -> float:
        """Calculate confidence score for pattern match"""
        try:
            if not extracted_data or extraction_score == 0:
                return 0.0
            
            # Base confidence from extraction success
            base_confidence = min(extraction_score / len(pattern.field_mapping), 1.0)
            
            # Adjust for data quality
            quality_bonus = 0.0
            if extracted_data:
                # Bonus for non-empty values
                non_empty_fields = sum(1 for v in extracted_data.values() if v and str(v).strip())
                quality_bonus = (non_empty_fields / len(extracted_data)) * 0.2
            
            # Adjust for pattern complexity (simpler patterns get lower confidence)
            complexity_factor = min(len(pattern.field_mapping) / 5.0, 1.0)
            
            # Final confidence calculation
            confidence = (base_confidence + quality_bonus) * complexity_factor
            
            return min(confidence, 1.0)
            
        except Exception as e:
            logger.debug(f"Failed to calculate confidence: {str(e)}")
            return 0.0

    def _generate_file_selection_recommendations(
        self, 
        scored_files: List[Dict], 
        quality_threshold: int
    ) -> Dict:
        """Generate intelligent recommendations for file selection"""
        try:
            if not scored_files:
                return {
                    "optimal_file_count": 0,
                    "quality_threshold": quality_threshold,
                    "message": "No files available for selection"
                }
            
            # Filter files by quality threshold
            quality_files = [
                f for f in scored_files 
                if f["extraction_score"] >= quality_threshold
            ]
            
            # Calculate recommendations
            total_files = len(scored_files)
            high_quality_files = len(quality_files)
            
            # Recommend optimal count (20-30% of quality files, max 50)
            optimal_count = min(
                max(int(high_quality_files * 0.25), 1),
                50
            )
            
            # Generate quality distribution
            excellent_files = len([f for f in scored_files if f["extraction_score"] >= 90])
            good_files = len([f for f in scored_files if 70 <= f["extraction_score"] < 90])
            poor_files = len([f for f in scored_files if f["extraction_score"] < 70])
            
            return {
                "optimal_file_count": optimal_count,
                "quality_threshold": quality_threshold,
                "total_analyzed": total_files,
                "quality_distribution": {
                    "excellent": excellent_files,
                    "good": good_files, 
                    "poor": poor_files
                },
                "recommendation_message": self._get_recommendation_message(
                    total_files, high_quality_files, optimal_count
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return {
                "optimal_file_count": 0,
                "quality_threshold": quality_threshold,
                "message": "Failed to generate recommendations"
            }

    def _get_recommendation_message(
        self, 
        total_files: int, 
        quality_files: int, 
        optimal_count: int
    ) -> str:
        """Generate human-readable recommendation message"""
        if quality_files == 0:
            return "No files meet the quality threshold. Consider lowering the threshold or choosing a different pattern."
        
        quality_rate = (quality_files / total_files) * 100
        
        if quality_rate >= 80:
            return f"Excellent pattern match! {quality_files} of {total_files} files have high extraction potential. Recommended: select top {optimal_count} files."
        elif quality_rate >= 50:
            return f"Good pattern match. {quality_files} of {total_files} files meet quality standards. Recommended: select top {optimal_count} files."
        elif quality_rate >= 20:
            return f"Moderate pattern match. {quality_files} of {total_files} files have decent extraction potential. Consider adjusting quality threshold."
        else:
            return f"Low pattern match. Only {quality_files} of {total_files} files meet quality standards. Consider choosing a different pattern."

    # Selection history management methods
    def record_pattern_selection(
        self, 
        pattern_id: int, 
        file_ids: List[int], 
        selection_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Record files that were selected for a pattern
        
        Args:
            pattern_id: ID of the pattern used
            file_ids: List of file IDs that were selected
            selection_context: Context information about the selection
            
        Returns:
            Dict with recording results
        """
        if not self.selection_history_repo:
            logger.warning("Selection history repository not available")
            return {
                "recorded_count": 0,
                "message": "Selection history not available"
            }
        
        try:
            records = self.selection_history_repo.record_selection(
                pattern_id=pattern_id,
                file_ids=file_ids,
                selection_context=selection_context
            )
            
            recorded_count = len(records)
            logger.info(f"Recorded {recorded_count} file selections for pattern {pattern_id}")
            
            return {
                "recorded_count": recorded_count,
                "message": f"Successfully recorded {recorded_count} file selections",
                "pattern_id": pattern_id,
                "recorded_files": [r.file_id for r in records]
            }
            
        except Exception as e:
            logger.error(f"Failed to record pattern selection: {str(e)}")
            return {
                "recorded_count": 0,
                "message": f"Failed to record selection: {str(e)}"
            }

    def reset_pattern_selections(self, pattern_id: int) -> Dict[str, Any]:
        """
        Reset selection history for a specific pattern
        
        Args:
            pattern_id: Pattern ID to reset
            
        Returns:
            Dict with reset results
        """
        if not self.selection_history_repo:
            return {
                "reset_count": 0,
                "message": "Selection history not available"
            }
        
        try:
            reset_count = self.selection_history_repo.reset_pattern_selections(pattern_id)
            logger.info(f"Reset {reset_count} selections for pattern {pattern_id}")
            
            return {
                "reset_count": reset_count,
                "message": f"Reset {reset_count} selection records for pattern {pattern_id}",
                "pattern_id": pattern_id
            }
            
        except Exception as e:
            logger.error(f"Failed to reset pattern selections: {str(e)}")
            return {
                "reset_count": 0,
                "message": f"Failed to reset selections: {str(e)}"
            }

    def reset_all_selections(self) -> Dict[str, Any]:
        """
        Reset all selection history
        
        Returns:
            Dict with reset results
        """
        if not self.selection_history_repo:
            return {
                "reset_count": 0,
                "message": "Selection history not available"
            }
        
        try:
            reset_count = self.selection_history_repo.reset_all_selections()
            logger.info(f"Reset {reset_count} total selections")
            
            return {
                "reset_count": reset_count,
                "message": f"Reset {reset_count} total selection records"
            }
            
        except Exception as e:
            logger.error(f"Failed to reset all selections: {str(e)}")
            return {
                "reset_count": 0,
                "message": f"Failed to reset selections: {str(e)}"
            }

    def get_pattern_selection_history(self, pattern_id: int) -> Dict[str, Any]:
        """
        Get selection history for a pattern
        
        Args:
            pattern_id: Pattern ID to get history for
            
        Returns:
            Dict with selection history and statistics
        """
        if not self.selection_history_repo:
            return {
                "history": [],
                "stats": {},
                "message": "Selection history not available"
            }
        
        try:
            # Get selection history
            history = self.selection_history_repo.get_selection_history(
                pattern_id=pattern_id,
                limit=100
            )
            
            # Get statistics
            stats = self.selection_history_repo.get_selection_stats(pattern_id)
            
            return {
                "history": [record.to_dict() for record in history],
                "stats": stats,
                "message": "Selection history retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to get selection history: {str(e)}")
            return {
                "history": [],
                "stats": {},
                "message": f"Failed to get selection history: {str(e)}"
            }