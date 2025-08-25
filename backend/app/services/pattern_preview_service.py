"""
Pattern Preview Service - Real-time pattern matching preview functionality

Provides fast pattern matching preview with security validation,
file count analysis, and sample file extraction for UX feedback.
"""
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.repositories.file_repository import FileRepository
from app.services.pattern_validation_service import PatternValidationService, PatternTester
from app.services.pattern_extraction_service import PatternExtractionService


@dataclass
class PatternPreviewResult:
    """Result of pattern preview operation"""
    match_count: int
    sample_files: List[Dict[str, Any]]
    security_validation: Dict[str, Any]
    is_valid: bool
    validation_errors: List[str]
    performance_metrics: Dict[str, Any]


class PatternPreviewService:
    """
    Service for real-time pattern matching preview functionality.
    
    Features:
    - Security validation with ReDoS protection
    - Fast file matching with performance limits
    - Sample file extraction with metadata
    - Comprehensive error handling
    """
    
    def __init__(
        self, 
        file_repository: FileRepository,
        pattern_validation_service: PatternValidationService,
        pattern_tester: PatternTester,
        pattern_extraction_service: PatternExtractionService
    ):
        self.file_repo = file_repository
        self.validation_service = pattern_validation_service
        self.pattern_tester = pattern_tester
        self.extraction_service = pattern_extraction_service
        self.logger = logging.getLogger(__name__)
        
        # Performance configuration
        self.max_files_to_scan = 10000  # Limit for performance
        self.preview_timeout_seconds = 10  # Timeout for preview operation
        self.max_sample_files = 5  # Maximum sample files to return
    
    async def preview_pattern_match(
        self, 
        regex_pattern: str, 
        max_sample_files: int = 1,
        include_metadata: bool = True
    ) -> PatternPreviewResult:
        """
        Preview pattern matching against available files
        
        Args:
            regex_pattern: Regular expression pattern to test
            max_sample_files: Maximum number of sample files to return (1-5)
            include_metadata: Whether to extract metadata from sample files
            
        Returns:
            PatternPreviewResult with match count, samples, and validation info
        """
        start_time = self._get_current_time_ms()
        
        try:
            # Validate input parameters
            max_sample_files = min(max_sample_files, self.max_sample_files)
            if not regex_pattern or not regex_pattern.strip():
                return PatternPreviewResult(
                    match_count=0,
                    sample_files=[],
                    security_validation={},
                    is_valid=False,
                    validation_errors=["Pattern cannot be empty"],
                    performance_metrics={}
                )
            
            # Step 1: Security validation first (critical for safety)
            self.logger.info(f"Starting pattern preview for: {regex_pattern[:50]}...")
            
            security_result = await self._validate_pattern_security(regex_pattern)
            if not security_result["is_safe"]:
                return PatternPreviewResult(
                    match_count=0,
                    sample_files=[],
                    security_validation=security_result,
                    is_valid=False,
                    validation_errors=security_result.get("errors", ["Pattern failed security validation"]),
                    performance_metrics={"validation_time_ms": self._get_current_time_ms() - start_time}
                )
            
            # Step 2: Compile regex pattern
            try:
                compiled_pattern = re.compile(regex_pattern, re.IGNORECASE)
            except re.error as e:
                return PatternPreviewResult(
                    match_count=0,
                    sample_files=[],
                    security_validation=security_result,
                    is_valid=False,
                    validation_errors=[f"Invalid regex pattern: {str(e)}"],
                    performance_metrics={"validation_time_ms": self._get_current_time_ms() - start_time}
                )
            
            # Step 3: Get files to scan (with performance limits)
            files_to_scan = await self._get_files_for_preview()
            if not files_to_scan:
                return PatternPreviewResult(
                    match_count=0,
                    sample_files=[],
                    security_validation=security_result,
                    is_valid=True,
                    validation_errors=[],
                    performance_metrics={"scan_time_ms": self._get_current_time_ms() - start_time}
                )
            
            # Step 4: Pattern matching with performance monitoring
            matching_results = await self._match_pattern_against_files(
                compiled_pattern, files_to_scan, max_sample_files, include_metadata
            )
            
            end_time = self._get_current_time_ms()
            performance_metrics = {
                "total_time_ms": end_time - start_time,
                "files_scanned": len(files_to_scan),
                "matches_found": matching_results["match_count"],
                "security_check_passed": security_result["is_safe"]
            }
            
            return PatternPreviewResult(
                match_count=matching_results["match_count"],
                sample_files=matching_results["sample_files"],
                security_validation=security_result,
                is_valid=True,
                validation_errors=[],
                performance_metrics=performance_metrics
            )
            
        except Exception as e:
            self.logger.error(f"Pattern preview failed: {str(e)}")
            return PatternPreviewResult(
                match_count=0,
                sample_files=[],
                security_validation={},
                is_valid=False,
                validation_errors=[f"Preview failed: {str(e)}"],
                performance_metrics={"error_time_ms": self._get_current_time_ms() - start_time}
            )
    
    async def _validate_pattern_security(self, pattern: str) -> Dict[str, Any]:
        """Validate pattern security using existing security services"""
        try:
            # Use existing pattern tester for security validation
            security_result = self.pattern_tester.validate_pattern_security(pattern)
            
            return {
                "is_safe": security_result.get("is_valid", False),
                "complexity_score": security_result.get("risk_score", 1.0),
                "dangerous_constructs": security_result.get("details", {}),
                "errors": [] if security_result.get("is_valid", False) else [security_result.get("message", "Security validation failed")],
                "warnings": security_result.get("recommendations", [])
            }
        except Exception as e:
            self.logger.error(f"Security validation failed: {str(e)}")
            return {
                "is_safe": False,
                "complexity_score": 1.0,
                "dangerous_constructs": {},
                "errors": [f"Security validation error: {str(e)}"],
                "warnings": []
            }
    
    async def _get_files_for_preview(self) -> List[Dict[str, Any]]:
        """Get list of files for pattern preview (with performance limits)"""
        try:
            # Get files with limit for performance
            files = self.file_repo.get_files_for_preview(limit=self.max_files_to_scan)
            
            # Convert to format needed for matching
            file_list = []
            for file_obj in files:
                file_list.append({
                    "id": file_obj.id,
                    "filename": file_obj.filename,
                    "path": file_obj.path,
                    "full_path": file_obj.full_path,
                    "extension": file_obj.extension
                })
            
            return file_list
        except Exception as e:
            self.logger.error(f"Failed to get files for preview: {str(e)}")
            return []
    
    async def _match_pattern_against_files(
        self, 
        compiled_pattern: re.Pattern, 
        files: List[Dict[str, Any]], 
        max_samples: int,
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Match pattern against files and collect samples"""
        match_count = 0
        sample_files = []
        
        try:
            for file_info in files:
                filename = file_info["filename"]
                
                # Test if pattern matches filename
                match = compiled_pattern.search(filename)
                if match:
                    match_count += 1
                    
                    # Collect sample files up to the limit
                    if len(sample_files) < max_samples:
                        sample_file = {
                            "id": file_info["id"],
                            "filename": filename,
                            "path": file_info["path"],
                            "full_path": file_info["full_path"],
                            "extension": file_info["extension"],
                            "match_groups": list(match.groups()) if match.groups() else []
                        }
                        
                        # Extract metadata if requested and possible
                        if include_metadata:
                            try:
                                # Use existing extraction service to get metadata
                                extracted_data = await self._extract_sample_metadata(
                                    file_info["id"], compiled_pattern.pattern
                                )
                                sample_file["extracted_data"] = extracted_data
                            except Exception as e:
                                self.logger.warning(f"Failed to extract metadata for {filename}: {str(e)}")
                                sample_file["extracted_data"] = None
                        
                        sample_files.append(sample_file)
            
            return {
                "match_count": match_count,
                "sample_files": sample_files
            }
            
        except Exception as e:
            self.logger.error(f"Pattern matching failed: {str(e)}")
            return {"match_count": 0, "sample_files": []}
    
    async def _extract_sample_metadata(self, file_id: int, pattern: str) -> Optional[Dict[str, Any]]:
        """Extract metadata from sample file using pattern"""
        try:
            # Create a temporary pattern for extraction
            temp_pattern_data = {
                "regex_pattern": pattern,
                "field_mapping": self._generate_basic_field_mapping(pattern)
            }
            
            # Use existing extraction service
            result = await self.extraction_service.extract_metadata_for_file(
                file_id, force_reapply=False
            )
            
            return result.get("extracted_data") if result else None
        except Exception as e:
            self.logger.warning(f"Sample metadata extraction failed: {str(e)}")
            return None
    
    def _generate_basic_field_mapping(self, pattern: str) -> Dict[str, str]:
        """Generate basic field mapping for pattern preview"""
        # Count capture groups in pattern
        try:
            compiled = re.compile(pattern)
            group_count = compiled.groups
            
            # Generate basic field mapping
            mapping = {}
            for i in range(1, group_count + 1):
                mapping[f"field_{i}"] = f"${i}:s$"  # Default to string type
            
            return mapping
        except:
            return {"preview": "$1:s$"}  # Fallback mapping
    
    def _get_current_time_ms(self) -> int:
        """Get current time in milliseconds"""
        import time
        return int(time.time() * 1000)