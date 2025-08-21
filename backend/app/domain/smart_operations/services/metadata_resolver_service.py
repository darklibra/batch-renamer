"""
Metadata Resolver Service - Intelligent metadata resolution for file operations

This service provides comprehensive metadata resolution with multiple fallback
strategies to ensure smart file operations always have the data they need.
"""

from typing import Dict, List, Optional, Any
import logging
import re
from pathlib import Path
from datetime import datetime

from app.domain.smart_operations.interfaces import MetadataResolverInterface
from app.domain.pattern.interfaces import PatternExtractorInterface
from app.models.file_models import IndexedFile

logger = logging.getLogger(__name__)


class MetadataResolverService(MetadataResolverInterface):
    """
    Intelligent metadata resolution with 4-tier fallback strategy
    
    Priority levels:
    1. Use existing extracted_data from file
    2. Apply specific pattern if provided  
    3. Auto-find best matching pattern
    4. Provide minimal fallback metadata
    """

    def __init__(self, pattern_extractor: Optional[PatternExtractorInterface] = None):
        """
        Initialize metadata resolver
        
        Args:
            pattern_extractor: Optional pattern extraction service for fallback
        """
        self._pattern_extractor = pattern_extractor
        
        # Common filename patterns for fallback extraction
        self._filename_patterns = {
            'episode': re.compile(r'(\d+)[-_\s]*(\d+)'),
            'date': re.compile(r'(\d{4})[-_]?(\d{2})[-_]?(\d{2})'),
            'season_episode': re.compile(r'[sS](\d+)[eE](\d+)'),
            'title_author': re.compile(r'([^_\-]+)[-_]+([^_\-]+)'),
            'numbered': re.compile(r'(\d+)')
        }
        
        logger.info("MetadataResolverService initialized with fallback patterns")

    async def resolve_file_metadata(
        self, 
        file: IndexedFile, 
        pattern_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Resolve metadata using 4-tier fallback strategy
        """
        try:
            logger.debug(f"Resolving metadata for file {file.id}: {file.filename}")
            
            # Priority 1: Use existing extracted_data
            if file.extracted_data and isinstance(file.extracted_data, dict):
                metadata = file.extracted_data.copy()
                self._enhance_metadata_with_file_info(metadata, file)
                logger.debug(f"Used existing extracted data for file {file.id}")
                return metadata
            
            # Priority 2: Apply specific pattern if provided
            if pattern_id and self._pattern_extractor:
                try:
                    extracted = await self._extract_with_specific_pattern(file, pattern_id)
                    if extracted and extracted.get('success'):
                        metadata = extracted.get('extracted_data', {})
                        self._enhance_metadata_with_file_info(metadata, file)
                        logger.debug(f"Applied specific pattern {pattern_id} for file {file.id}")
                        return metadata
                except Exception as e:
                    logger.warning(f"Pattern {pattern_id} extraction failed for file {file.id}: {str(e)}")
            
            # Priority 3: Auto-find best matching pattern
            if self._pattern_extractor:
                try:
                    best_match = await self._find_best_matching_pattern(file)
                    if best_match and best_match.get('success'):
                        metadata = best_match.get('extracted_data', {})
                        self._enhance_metadata_with_file_info(metadata, file)
                        logger.debug(f"Auto-matched pattern for file {file.id}")
                        return metadata
                except Exception as e:
                    logger.warning(f"Auto-pattern matching failed for file {file.id}: {str(e)}")
            
            # Priority 4: Provide minimal fallback metadata
            metadata = self.get_fallback_metadata(file)
            logger.debug(f"Using fallback metadata for file {file.id}")
            return metadata
            
        except Exception as e:
            logger.error(f"Metadata resolution failed for file {file.id}: {str(e)}")
            return self.get_fallback_metadata(file)

    async def batch_resolve_metadata(
        self, 
        files: List[IndexedFile], 
        pattern_id: Optional[int] = None
    ) -> Dict[int, Dict[str, Any]]:
        """
        Efficiently resolve metadata for multiple files
        """
        results = {}
        
        # Group files by metadata availability
        files_with_data = []
        files_without_data = []
        
        for file in files:
            if file.extracted_data and isinstance(file.extracted_data, dict):
                files_with_data.append(file)
            else:
                files_without_data.append(file)
        
        # Process files with existing data (fast path)
        for file in files_with_data:
            metadata = file.extracted_data.copy()
            self._enhance_metadata_with_file_info(metadata, file)
            results[file.id] = metadata
        
        # Process files without data (requires extraction)
        for file in files_without_data:
            metadata = await self.resolve_file_metadata(file, pattern_id)
            results[file.id] = metadata
        
        logger.info(f"Batch resolved metadata for {len(files)} files")
        return results

    def get_fallback_metadata(self, file: IndexedFile) -> Dict[str, Any]:
        """
        Generate comprehensive fallback metadata
        """
        try:
            filename = file.filename or 'unknown'
            extension = file.extension or ''
            
            # Basic file information
            metadata = {
                'filename': filename,
                'name': filename,
                'title': filename,
                'extension': extension,
                'ext': extension.lstrip('.') if extension else '',
                'original_name': filename,
                'file_id': file.id,
                'path': file.path or '',
                'full_path': file.full_path or ''
            }
            
            # Try to extract patterns from filename
            enhanced_metadata = self._extract_patterns_from_filename(filename)
            metadata.update(enhanced_metadata)
            
            # Add timestamp information
            now = datetime.now()
            metadata.update({
                'date': now.strftime('%Y%m%d'),
                'year': now.strftime('%Y'),
                'month': now.strftime('%m'),
                'day': now.strftime('%d'),
                'timestamp': now.strftime('%Y%m%d_%H%M%S')
            })
            
            # Add file statistics if available
            if file.file_size:
                metadata['file_size'] = file.file_size
            
            if file.created_at:
                metadata['created_date'] = file.created_at.strftime('%Y%m%d')
                
            if file.updated_at:
                metadata['modified_date'] = file.updated_at.strftime('%Y%m%d')
            
            logger.debug(f"Generated fallback metadata for {filename}: {len(metadata)} fields")
            return metadata
            
        except Exception as e:
            logger.error(f"Fallback metadata generation failed: {str(e)}")
            # Absolute minimum fallback
            return {
                'filename': 'unknown',
                'name': 'unknown',
                'extension': '',
                'date': datetime.now().strftime('%Y%m%d')
            }

    def _enhance_metadata_with_file_info(self, metadata: Dict[str, Any], file: IndexedFile) -> None:
        """
        Enhance metadata with additional file information
        """
        # Add basic file info if not present
        if 'filename' not in metadata:
            metadata['filename'] = file.filename or 'unknown'
            
        if 'extension' not in metadata and 'ext' not in metadata:
            ext = file.extension or ''
            metadata['extension'] = ext
            metadata['ext'] = ext.lstrip('.') if ext else ''
            
        if 'path' not in metadata:
            metadata['path'] = file.path or ''
            
        if 'full_path' not in metadata:
            metadata['full_path'] = file.full_path or ''
            
        # Add file system metadata
        if file.file_size and 'file_size' not in metadata:
            metadata['file_size'] = file.file_size
            
        if file.created_at and 'created_date' not in metadata:
            metadata['created_date'] = file.created_at.strftime('%Y%m%d')
            
        # Ensure critical fields exist
        if 'name' not in metadata:
            metadata['name'] = metadata.get('filename', 'unknown')
            
        if 'title' not in metadata:
            metadata['title'] = metadata.get('name', metadata.get('filename', 'unknown'))

    def _extract_patterns_from_filename(self, filename: str) -> Dict[str, Any]:
        """
        Extract common patterns from filename using regex
        """
        extracted = {}
        
        try:
            # Episode pattern (e.g., "01-12", "1_5")
            if 'episode' in self._filename_patterns:
                match = self._filename_patterns['episode'].search(filename)
                if match:
                    extracted['start'] = match.group(1)
                    extracted['end'] = match.group(2)
                    extracted['start_episode'] = int(match.group(1))
                    extracted['end_episode'] = int(match.group(2))
            
            # Date pattern (e.g., "20240101", "2024-01-01")
            if 'date' in self._filename_patterns:
                match = self._filename_patterns['date'].search(filename)
                if match:
                    extracted['year'] = match.group(1)
                    extracted['month'] = match.group(2)
                    extracted['day'] = match.group(3)
                    extracted['date'] = f"{match.group(1)}{match.group(2)}{match.group(3)}"
            
            # Season/Episode pattern (e.g., "S01E05")
            if 'season_episode' in self._filename_patterns:
                match = self._filename_patterns['season_episode'].search(filename)
                if match:
                    extracted['season'] = int(match.group(1))
                    extracted['episode'] = int(match.group(2))
            
            # Title/Author pattern (e.g., "Title_Author", "Title-Author")
            if 'title_author' in self._filename_patterns:
                match = self._filename_patterns['title_author'].search(filename)
                if match:
                    extracted['title'] = match.group(1).strip()
                    extracted['author'] = match.group(2).strip()
            
            # Any numbered content
            if 'numbered' in self._filename_patterns:
                numbers = self._filename_patterns['numbered'].findall(filename)
                if numbers:
                    extracted['numbers'] = numbers
                    extracted['first_number'] = int(numbers[0])
                    if len(numbers) > 1:
                        extracted['second_number'] = int(numbers[1])
            
        except Exception as e:
            logger.warning(f"Pattern extraction from filename failed: {str(e)}")
        
        return extracted

    async def _extract_with_specific_pattern(self, file: IndexedFile, pattern_id: int) -> Optional[Dict[str, Any]]:
        """
        Extract metadata using a specific pattern
        """
        if not self._pattern_extractor:
            return None
            
        try:
            # This would call the pattern extraction service
            # Implementation depends on the pattern extractor interface
            result = await self._pattern_extractor.extract_with_pattern(
                filename=f"{file.filename}{file.extension or ''}",
                pattern_id=pattern_id
            )
            return result
            
        except Exception as e:
            logger.error(f"Specific pattern extraction failed: {str(e)}")
            return None

    async def _find_best_matching_pattern(self, file: IndexedFile) -> Optional[Dict[str, Any]]:
        """
        Find and apply the best matching pattern for a file
        """
        if not self._pattern_extractor:
            return None
            
        try:
            # This would call the pattern extraction service to find best match
            result = await self._pattern_extractor.extract_with_best_pattern(
                filename=f"{file.filename}{file.extension or ''}"
            )
            return result
            
        except Exception as e:
            logger.error(f"Best pattern matching failed: {str(e)}")
            return None