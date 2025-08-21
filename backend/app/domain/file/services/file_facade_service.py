"""
File Facade Service - Unified interface for file domain operations

This service provides a clean, unified interface to all file domain capabilities,
orchestrating interactions between different file domain services.
"""

from typing import Dict, Any, List, Optional, AsyncGenerator
import logging

from app.domain.file.interfaces import (
    FileIndexerInterface, 
    FileIndexingJobInterface, 
    FileValidatorInterface
)
from app.models.file_models import IndexedFile

logger = logging.getLogger(__name__)


class FileFacadeService:
    """
    Unified facade for file domain operations
    
    Provides a single entry point for all file-related operations,
    orchestrating the interaction between file indexing, job management,
    and validation services.
    """

    def __init__(
        self,
        file_indexer: FileIndexerInterface,
        job_manager: FileIndexingJobInterface,
        file_validator: FileValidatorInterface
    ):
        """
        Initialize file facade with injected dependencies
        
        Args:
            file_indexer: Core file indexing service
            job_manager: Job management service
            file_validator: File validation service
        """
        self._file_indexer = file_indexer
        self._job_manager = job_manager
        self._file_validator = file_validator
        
        logger.info("FileFacadeService initialized with all dependencies")

    # File Indexing Operations

    async def scan_directory_immediately(
        self, 
        directory_path: str, 
        scan_config: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[IndexedFile, None]:
        """
        Perform immediate directory scanning without job management
        
        Useful for small directories or real-time scanning needs.
        
        Args:
            directory_path: Directory to scan
            scan_config: Optional scanning configuration
            
        Yields:
            IndexedFile: Each discovered file
        """
        logger.info(f"Starting immediate directory scan: {directory_path}")
        
        async for indexed_file in self._file_indexer.scan_directory(directory_path, scan_config):
            yield indexed_file

    async def validate_directory_for_scanning(self, directory_path: str) -> Dict[str, Any]:
        """
        Validate if a directory is suitable for scanning
        
        Args:
            directory_path: Directory to validate
            
        Returns:
            Dict with validation results and recommendations
        """
        return await self._file_indexer.validate_scan_path(directory_path)

    async def get_recommended_exclusion_patterns(self) -> List[str]:
        """
        Get recommended exclusion patterns for file scanning
        
        Returns:
            List of recommended exclusion patterns
        """
        return await self._file_indexer.get_exclusion_patterns()

    # Job Management Operations

    async def start_background_indexing_job(
        self, 
        directory_path: str, 
        scan_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Start a background indexing job with comprehensive validation
        
        Args:
            directory_path: Directory to index
            scan_config: Optional scanning configuration
            
        Returns:
            Dict with job information and status
        """
        try:
            # Validate directory first
            validation_result = await self.validate_directory_for_scanning(directory_path)
            if not validation_result['is_valid']:
                return {
                    'success': False,
                    'error': f"Directory validation failed: {validation_result['message']}",
                    'validation_details': validation_result
                }
            
            # Start the job
            job_id = await self._job_manager.start_indexing_job(directory_path, scan_config)
            
            # Return job information
            return {
                'success': True,
                'job_id': job_id,
                'message': f'Indexing job started for directory: {directory_path}',
                'validation_details': validation_result
            }
            
        except Exception as e:
            logger.error(f"Failed to start background indexing job: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_indexing_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get comprehensive status information for an indexing job
        
        Args:
            job_id: ID of the job to check
            
        Returns:
            Dict with detailed job status and progress information
        """
        return await self._job_manager.get_job_status(job_id)

    async def cancel_indexing_job(self, job_id: str) -> Dict[str, Any]:
        """
        Cancel a running indexing job
        
        Args:
            job_id: ID of the job to cancel
            
        Returns:
            Dict with cancellation result
        """
        try:
            success = await self._job_manager.cancel_job(job_id)
            return {
                'success': success,
                'message': f'Job {job_id} {"cancelled successfully" if success else "could not be cancelled"}',
                'job_id': job_id
            }
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'job_id': job_id
            }

    async def get_indexing_job_results(self, job_id: str) -> Dict[str, Any]:
        """
        Get comprehensive results from a completed indexing job
        
        Args:
            job_id: ID of the completed job
            
        Returns:
            Dict with job results and analysis
        """
        return await self._job_manager.get_job_results(job_id)

    # File Validation Operations

    def validate_file_path_security(self, file_path: str) -> Dict[str, Any]:
        """
        Perform comprehensive security validation on a file path
        
        Args:
            file_path: Path to validate
            
        Returns:
            Dict with security validation results
        """
        return self._file_validator.validate_file_path(file_path)

    def sanitize_filename_for_safety(self, filename: str) -> str:
        """
        Sanitize a filename to ensure it's safe for file system operations
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        return self._file_validator.sanitize_filename(filename)

    def check_file_system_permissions(self, file_path: str) -> Dict[str, bool]:
        """
        Check file system permissions for a given path
        
        Args:
            file_path: Path to check
            
        Returns:
            Dict with permission information
        """
        return self._file_validator.check_file_permissions(file_path)

    # Composite Operations

    async def comprehensive_directory_analysis(self, directory_path: str) -> Dict[str, Any]:
        """
        Perform comprehensive analysis of a directory before indexing
        
        Combines security validation, permission checks, and directory structure analysis.
        
        Args:
            directory_path: Directory to analyze
            
        Returns:
            Dict with comprehensive analysis results
        """
        try:
            logger.info(f"Starting comprehensive directory analysis: {directory_path}")
            
            # Security validation
            security_result = self.validate_file_path_security(directory_path)
            
            # Permission checks
            permissions = self.check_file_system_permissions(directory_path)
            
            # Directory structure validation
            scan_validation = await self.validate_directory_for_scanning(directory_path)
            
            # Get recommended exclusions
            exclusion_patterns = await self.get_recommended_exclusion_patterns()
            
            # Compile comprehensive analysis
            analysis = {
                'directory_path': directory_path,
                'security_assessment': security_result,
                'permissions': permissions,
                'scan_validation': scan_validation,
                'recommended_exclusions': exclusion_patterns,
                'ready_for_indexing': (
                    security_result.get('is_secure', False) and
                    permissions.get('readable', False) and
                    scan_validation.get('is_valid', False)
                ),
                'recommendations': self._generate_analysis_recommendations(
                    security_result, permissions, scan_validation
                )
            }
            
            logger.info(f"Directory analysis completed for: {directory_path}")
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze directory {directory_path}: {str(e)}")
            return {
                'directory_path': directory_path,
                'error': str(e),
                'ready_for_indexing': False,
                'recommendations': ['Analysis failed - manual review required']
            }

    def _generate_analysis_recommendations(
        self, 
        security_result: Dict[str, Any], 
        permissions: Dict[str, bool], 
        scan_validation: Dict[str, Any]
    ) -> List[str]:
        """
        Generate actionable recommendations based on analysis results
        """
        recommendations = []
        
        # Security recommendations
        if not security_result.get('is_secure', False):
            recommendations.append("Address security concerns before indexing")
            if security_result.get('warnings'):
                recommendations.extend([f"Security: {w}" for w in security_result['warnings']])
        
        # Permission recommendations
        if not permissions.get('readable', False):
            recommendations.append("Ensure directory has read permissions")
        if not permissions.get('exists', False):
            recommendations.append("Verify directory exists and is accessible")
        
        # Scan validation recommendations
        if not scan_validation.get('is_valid', False):
            recommendations.append(f"Scan validation issue: {scan_validation.get('message', 'Unknown')}")
        
        # Positive recommendations
        if not recommendations:
            recommendations.append("Directory is ready for indexing")
            if security_result.get('security_score', 0) < 0.8:
                recommendations.append("Consider reviewing exclusion patterns for better security")
        
        return recommendations