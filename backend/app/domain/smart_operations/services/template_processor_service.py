"""
Template Processor Service - Intelligent filename template processing

This service handles template validation, processing, and preview generation
for smart file operations with comprehensive error handling and fallback support.
"""

import re
import string
from typing import Dict, List, Optional, Tuple, Any
import logging

from app.domain.smart_operations.interfaces import TemplateProcessorInterface
from app.models.file_models import IndexedFile

logger = logging.getLogger(__name__)


class TemplateProcessorService(TemplateProcessorInterface):
    """
    Core implementation of template processing for smart file operations
    
    Provides:
    - Template validation with detailed error reporting
    - Safe template processing with fallback support
    - Field extraction and analysis
    - Batch preview generation
    """

    def __init__(self):
        """Initialize template processor with security and validation rules"""
        
        # Template validation patterns
        self._field_pattern = re.compile(r'\{([^}]+)\}')
        self._safe_filename_chars = set(string.ascii_letters + string.digits + '-_. ')
        
        # Reserved system names (Windows compatibility)
        self._reserved_names = {
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        }
        
        # Common fallback field mappings
        self._fallback_fields = {
            'name': 'filename',
            'title': 'filename', 
            'filename': 'original_name',
            'extension': 'ext',
            'ext': 'extension'
        }
        
        logger.info("TemplateProcessorService initialized with security validation")

    def validate_template(self, template: str, sample_metadata: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Comprehensive template validation with detailed error reporting
        """
        try:
            if not template or not template.strip():
                return False, "Template cannot be empty"
            
            # Extract field placeholders
            fields = self.get_template_fields(template)
            if not fields:
                return False, "Template must contain at least one field placeholder like {field}"
            
            # Check for invalid characters in template structure
            if any(char in template for char in '<>:"|?*\\'):
                return False, "Template contains invalid filename characters"
            
            # Validate field availability
            missing_fields = []
            available_fields = set(sample_metadata.keys()) if sample_metadata else set()
            
            for field in fields:
                if field not in available_fields:
                    # Check if fallback mapping exists
                    if field not in self._fallback_fields and not self._has_fallback_for_field(field):
                        missing_fields.append(field)
            
            if missing_fields:
                return False, f"Fields not available in metadata: {', '.join(missing_fields)}"
            
            # Test template rendering with sample data
            try:
                test_metadata = sample_metadata.copy() if sample_metadata else {}
                # Add fallback data for missing fields
                for field in fields:
                    if field not in test_metadata:
                        test_metadata[field] = self._get_sample_fallback_value(field)
                
                test_result = self.process_template(template, test_metadata)
                
                # Validate the generated filename
                is_valid, error = self._validate_generated_filename(test_result)
                if not is_valid:
                    return False, f"Template generates invalid filename: {error}"
                
            except Exception as e:
                return False, f"Template processing failed: {str(e)}"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Template validation error: {str(e)}")
            return False, f"Validation error: {str(e)}"

    def process_template(self, template: str, metadata: Dict[str, Any], fallback_data: Dict[str, Any] = None) -> str:
        """
        Process template with intelligent fallback and sanitization
        """
        try:
            # Combine metadata with fallback data
            combined_data = {}
            if fallback_data:
                combined_data.update(fallback_data)
            if metadata:
                combined_data.update(metadata)
            
            # Extract fields from template
            fields = self.get_template_fields(template)
            
            # Resolve missing fields with fallback strategies
            resolved_data = {}
            for field in fields:
                if field in combined_data:
                    resolved_data[field] = combined_data[field]
                else:
                    resolved_data[field] = self._resolve_field_fallback(field, combined_data)
            
            # Process the template
            processed = template.format(**resolved_data)
            
            # Sanitize the result
            sanitized = self._sanitize_filename(processed)
            
            logger.debug(f"Template processed successfully: '{template}' -> '{sanitized}'")
            return sanitized
            
        except KeyError as e:
            logger.error(f"Template processing failed - missing field {e}")
            return self._generate_safe_fallback_filename(template, metadata)
        except Exception as e:
            logger.error(f"Template processing error: {str(e)}")
            return self._generate_safe_fallback_filename(template, metadata)

    def get_template_fields(self, template: str) -> List[str]:
        """
        Extract unique field names from template
        """
        try:
            matches = self._field_pattern.findall(template)
            return list(set(matches))  # Remove duplicates
        except Exception as e:
            logger.error(f"Failed to extract template fields: {str(e)}")
            return []

    def preview_template_results(self, template: str, files: List[IndexedFile]) -> List[Dict[str, Any]]:
        """
        Generate preview results for multiple files with error handling
        """
        previews = []
        
        for file in files:
            try:
                # Get file metadata
                metadata = file.extracted_data or {}
                
                # Add basic file information
                metadata.update({
                    'filename': file.filename or 'unnamed',
                    'extension': file.extension or '',
                    'original_name': file.filename or 'unnamed'
                })
                
                # Process template
                generated_filename = self.process_template(template, metadata)
                
                # Create preview result
                preview = {
                    'file_id': file.id,
                    'original_filename': f"{file.filename}{file.extension or ''}",
                    'original_path': file.full_path,
                    'generated_filename': generated_filename,
                    'metadata_used': metadata,
                    'success': True,
                    'warnings': []
                }
                
                # Check for potential issues
                warnings = self._analyze_preview_result(generated_filename, file)
                if warnings:
                    preview['warnings'] = warnings
                
                previews.append(preview)
                
            except Exception as e:
                logger.error(f"Preview generation failed for file {file.id}: {str(e)}")
                previews.append({
                    'file_id': file.id,
                    'original_filename': f"{file.filename}{file.extension or ''}",
                    'original_path': file.full_path,
                    'generated_filename': 'error_processing_template',
                    'success': False,
                    'error': str(e),
                    'warnings': ['Template processing failed']
                })
        
        return previews

    def _resolve_field_fallback(self, field: str, available_data: Dict[str, Any]) -> str:
        """
        Resolve missing field using fallback strategies
        """
        # Try direct fallback mapping
        if field in self._fallback_fields:
            fallback_field = self._fallback_fields[field]
            if fallback_field in available_data:
                return str(available_data[fallback_field])
        
        # Try pattern-based fallbacks
        if 'name' in field.lower():
            for key in ['filename', 'title', 'name']:
                if key in available_data:
                    return str(available_data[key])
        
        if 'date' in field.lower() or 'time' in field.lower():
            from datetime import datetime
            return datetime.now().strftime('%Y%m%d')
        
        if 'number' in field.lower() or 'id' in field.lower():
            return '001'
        
        # Default fallback
        return f'unknown_{field}'

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to ensure filesystem compatibility
        """
        if not filename:
            return 'unnamed_file'
        
        # Remove or replace dangerous characters
        sanitized = ''.join(char if char in self._safe_filename_chars else '_' for char in filename)
        
        # Handle reserved names
        name_part = sanitized.split('.')[0].upper()
        if name_part in self._reserved_names:
            sanitized = f"file_{sanitized}"
        
        # Limit length (filesystem limit is usually 255 characters)
        if len(sanitized) > 250:
            name, ext = self._split_filename_extension(sanitized)
            sanitized = name[:240] + ext
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        # Ensure not empty
        if not sanitized:
            sanitized = 'unnamed_file'
        
        return sanitized

    def _validate_generated_filename(self, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a generated filename for filesystem compatibility
        """
        if not filename:
            return False, "Generated filename is empty"
        
        if len(filename) > 255:
            return False, "Generated filename is too long (>255 characters)"
        
        # Check for reserved names
        name_part = filename.split('.')[0].upper()
        if name_part in self._reserved_names:
            return False, f"Generated filename uses reserved name: {name_part}"
        
        # Check for invalid characters
        invalid_chars = set(filename) - self._safe_filename_chars - {'.'} 
        if invalid_chars:
            return False, f"Generated filename contains invalid characters: {', '.join(invalid_chars)}"
        
        return True, None

    def _analyze_preview_result(self, generated_filename: str, original_file: IndexedFile) -> List[str]:
        """
        Analyze preview result for potential issues and warnings
        """
        warnings = []
        
        # Check for generic fallback usage
        if 'unknown_' in generated_filename:
            warnings.append("Some template fields used fallback values")
        
        # Check for filename truncation
        if len(generated_filename) >= 240:
            warnings.append("Filename may be truncated due to length limits")
        
        # Check for loss of original extension
        original_ext = original_file.extension or ''
        if original_ext and original_ext not in generated_filename:
            warnings.append("Original file extension not preserved in template")
        
        return warnings

    def _generate_safe_fallback_filename(self, template: str, metadata: Dict[str, Any]) -> str:
        """
        Generate a safe fallback filename when template processing fails
        """
        try:
            # Use original filename if available
            if metadata and 'filename' in metadata:
                base_name = str(metadata['filename'])
            else:
                base_name = 'processed_file'
            
            # Add timestamp to ensure uniqueness
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            fallback = f"{base_name}_{timestamp}"
            return self._sanitize_filename(fallback)
            
        except Exception:
            return 'fallback_filename'

    def _split_filename_extension(self, filename: str) -> Tuple[str, str]:
        """
        Split filename into name and extension parts
        """
        if '.' in filename:
            parts = filename.rsplit('.', 1)
            return parts[0], '.' + parts[1]
        return filename, ''

    def _has_fallback_for_field(self, field: str) -> bool:
        """
        Check if a field has available fallback strategies
        """
        field_lower = field.lower()
        return any(keyword in field_lower for keyword in ['name', 'date', 'time', 'number', 'id'])

    def _get_sample_fallback_value(self, field: str) -> str:
        """
        Get a sample fallback value for template validation
        """
        field_lower = field.lower()
        
        if 'name' in field_lower or 'title' in field_lower:
            return 'sample_name'
        elif 'date' in field_lower:
            return '20240101'
        elif 'time' in field_lower:
            return '120000'
        elif 'number' in field_lower or 'id' in field_lower:
            return '001'
        else:
            return f'sample_{field}'