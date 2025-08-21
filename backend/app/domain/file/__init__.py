"""
File Domain - Modular file management system

This domain handles all file-related operations including:
- File indexing and scanning
- Job management and progress tracking
- File validation and security
- Batch processing and exclusion patterns

Architecture follows SOLID principles with:
- Clear interface contracts
- Dependency injection support
- Single responsibility per service
- Composable facade pattern
"""

from .interfaces import (
    FileIndexerInterface,
    FileIndexingJobInterface,
    FileValidatorInterface
)

from .services import (
    FileIndexingCore,
    FileIndexingJobManager,
    FileValidatorService,
    FileFacadeService
)

__all__ = [
    # Interfaces
    'FileIndexerInterface',
    'FileIndexingJobInterface', 
    'FileValidatorInterface',
    
    # Services
    'FileIndexingCore',
    'FileIndexingJobManager',
    'FileValidatorService',
    'FileFacadeService'
]