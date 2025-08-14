import re
import json
import uuid
import time
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from pathlib import Path

from app.models.file_models import IndexedFile, ExtractionPattern, PatternApplication, PatternFailure, PatternExtractionJob
from app.repositories.file_repository import FileRepository
from app.repositories.pattern_repository import PatternRepository, PatternApplicationRepository, PatternFailureRepository, PatternExtractionJobRepository


class PatternExtractionService:
    """
    Service for intelligent pattern extraction from filenames with best-match algorithm
    """
    
    def __init__(
        self,
        file_repository: FileRepository,
        pattern_repository: PatternRepository,
        application_repository: PatternApplicationRepository,
        failure_repository: PatternFailureRepository,
        job_repository: PatternExtractionJobRepository
    ):
        self.file_repo = file_repository
        self.pattern_repo = pattern_repository
        self.application_repo = application_repository
        self.failure_repo = failure_repository
        self.job_repo = job_repository

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
        Apply a single pattern to extract metadata from filename
        
        Returns:
            - extracted_data: Dict with extracted fields
            - extraction_score: Number of successfully extracted fields
        """
        try:
            # Apply regex pattern
            match = re.match(pattern.regex_pattern, filename)
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
                            
                            # Convert to appropriate type
                            converted_value = self._convert_field_type(raw_value, field_type)
                            extracted_data[field_name] = converted_value
                            successful_extractions += 1
                    else:
                        # Static value or unsupported format
                        extracted_data[field_name] = field_config
                        successful_extractions += 1
                        
                except (IndexError, ValueError, TypeError) as e:
                    # Field extraction failed, skip this field
                    print(f"Failed to extract field {field_name}: {str(e)}")
                    continue
            
            return extracted_data if successful_extractions > 0 else None, successful_extractions
            
        except re.error as e:
            raise ValueError(f"Invalid regex pattern: {str(e)}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid field mapping JSON: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Pattern application failed: {str(e)}")

    def _convert_field_type(self, value: str, field_type: str) -> Any:
        """
        Convert extracted string value to appropriate type
        
        Supported types:
        - 's': string (default)
        - 'd': integer
        - 'f': float
        - 'b': boolean
        - 'date': datetime
        """
        if not value or field_type == 's':
            return value
        
        try:
            if field_type == 'd':
                return int(value)
            elif field_type == 'f':
                return float(value)
            elif field_type == 'b':
                return value.lower() in ('true', '1', 'yes', 'on')
            elif field_type == 'date':
                # Try common date formats
                for date_format in ['%Y-%m-%d', '%Y%m%d', '%d-%m-%Y', '%m-%d-%Y']:
                    try:
                        return datetime.strptime(value, date_format)
                    except ValueError:
                        continue
                raise ValueError(f"Could not parse date: {value}")
            else:
                # Unknown type, return as string
                return value
        except (ValueError, TypeError):
            # Conversion failed, return original string
            return value

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
        force_reapply: bool = False
    ) -> str:
        """
        Start a background job to extract metadata for multiple files
        
        Returns:
            job_id: UUID of the background job
        """
        job_id = str(uuid.uuid4())
        
        # Create job record
        job_data = {
            'id': job_id,
            'job_type': 'batch_extract',
            'file_ids': file_ids,
            'pattern_ids': pattern_ids or [],
            'status': 'started',
            'total_count': len(file_ids),
            'processed_count': 0,
            'successful_extractions': 0,
            'failed_extractions': 0
        }
        
        self.job_repo.create_job(job_data)
        
        # Start background processing
        asyncio.create_task(self._process_batch_extraction_job(job_id, file_ids, force_reapply))
        
        return job_id

    async def _process_batch_extraction_job(
        self, 
        job_id: str, 
        file_ids: List[int], 
        force_reapply: bool = False
    ):
        """
        Background task to process batch metadata extraction
        """
        try:
            self.job_repo.update_job_progress(job_id, {
                'status': 'processing'
            })
            
            successful_extractions = 0
            failed_extractions = 0
            results = []
            
            for i, file_id in enumerate(file_ids):
                try:
                    # Extract metadata for single file
                    result = await self.extract_metadata_for_file(file_id, force_reapply)
                    
                    if result['success']:
                        successful_extractions += 1
                    else:
                        failed_extractions += 1
                    
                    results.append({
                        'file_id': file_id,
                        'success': result['success'],
                        'extracted_data': result.get('extracted_data'),
                        'pattern_id': result.get('pattern_id'),
                        'error': result.get('error')
                    })
                    
                    # Update job progress
                    self.job_repo.update_job_progress(job_id, {
                        'processed_count': i + 1,
                        'successful_extractions': successful_extractions,
                        'failed_extractions': failed_extractions
                    })
                    
                    # Small delay to prevent overwhelming the system
                    if i % 10 == 0:  # Every 10 files
                        await asyncio.sleep(0.1)
                        
                except Exception as e:
                    failed_extractions += 1
                    results.append({
                        'file_id': file_id,
                        'success': False,
                        'error': f'Processing error: {str(e)}'
                    })
            
            # Complete job
            self.job_repo.update_job_progress(job_id, {
                'status': 'completed',
                'successful_extractions': successful_extractions,
                'failed_extractions': failed_extractions,
                'result_data': {
                    'summary': {
                        'total_processed': len(file_ids),
                        'successful': successful_extractions,
                        'failed': failed_extractions,
                        'success_rate': successful_extractions / len(file_ids) * 100 if file_ids else 0
                    },
                    'results': results[:100]  # Limit stored results for large batches
                },
                'completed_at': datetime.utcnow()
            })
            
        except Exception as e:
            # Job failed
            self.job_repo.update_job_progress(job_id, {
                'status': 'error',
                'error_message': f'Batch extraction job failed: {str(e)}',
                'completed_at': datetime.utcnow()
            })

    def test_pattern_against_files(
        self, 
        pattern_data: Dict, 
        file_ids: List[int]
    ) -> Dict:
        """
        Test a pattern against specific files without saving results
        
        Args:
            pattern_data: Dict with pattern information (name, regex_pattern, field_mapping)
            file_ids: List of file IDs to test against
            
        Returns:
            Dict with test results for each file
        """
        try:
            # Create temporary pattern object
            temp_pattern = ExtractionPattern()
            temp_pattern.name = pattern_data['name']
            temp_pattern.regex_pattern = pattern_data['regex_pattern']
            temp_pattern.field_mapping = pattern_data['field_mapping']
            temp_pattern.priority = 1
            
            results = {}
            
            for file_id in file_ids:
                file_record = self.file_repo.get_file_by_id(file_id)
                if not file_record:
                    results[file_id] = {
                        'success': False,
                        'error': 'File not found'
                    }
                    continue
                
                try:
                    extracted_data, score = self._apply_single_pattern(file_record.filename, temp_pattern)
                    
                    results[file_id] = {
                        'success': extracted_data is not None,
                        'filename': file_record.filename,
                        'extracted_data': extracted_data,
                        'extraction_score': score,
                        'matched': extracted_data is not None
                    }
                    
                except Exception as e:
                    results[file_id] = {
                        'success': False,
                        'filename': file_record.filename,
                        'error': str(e)
                    }
            
            return {
                'pattern_name': pattern_data['name'],
                'total_files_tested': len(file_ids),
                'successful_matches': sum(1 for r in results.values() if r.get('success')),
                'results': results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Pattern test failed: {str(e)}',
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
        return self.application_repo.get_pattern_performance_stats(pattern_id)

    def get_extraction_overview(self) -> Dict:
        """
        Get overall extraction statistics
        """
        return {
            'total_files': self.file_repo.get_file_count(),
            'files_with_extractions': self.application_repo.get_files_with_extractions_count(),
            'total_applications': self.application_repo.get_total_applications_count(),
            'total_failures': self.failure_repo.get_total_failures_count(),
            'active_patterns': len(self.pattern_repo.get_active_patterns()),
            'recent_jobs': self.job_repo.get_recent_jobs(limit=5)
        }