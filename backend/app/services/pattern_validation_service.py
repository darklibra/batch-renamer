import re
import json
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

from app.models.file_models import ExtractionPattern
from app.core.security_validator import get_pattern_validator, ValidationResult as SecurityValidationResult

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Validation severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationResult:
    """Individual validation result"""
    severity: ValidationSeverity
    message: str
    field: Optional[str] = None
    suggestion: Optional[str] = None
    code: Optional[str] = None


@dataclass
class PatternValidationReport:
    """Complete pattern validation report"""
    is_valid: bool
    score: int  # 0-100
    results: List[ValidationResult]
    
    def get_errors(self) -> List[ValidationResult]:
        """Get only error-level results"""
        return [r for r in self.results if r.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]]
    
    def get_warnings(self) -> List[ValidationResult]:
        """Get warning-level results"""
        return [r for r in self.results if r.severity == ValidationSeverity.WARNING]
    
    def has_critical_issues(self) -> bool:
        """Check if there are critical issues"""
        return any(r.severity == ValidationSeverity.CRITICAL for r in self.results)


class PatternValidationService:
    """Service for validating extraction patterns"""
    
    def __init__(self):
        self.common_patterns = self._load_common_patterns()
    
    def validate_pattern(
        self, 
        pattern_data: Dict,
        test_filenames: Optional[List[str]] = None
    ) -> PatternValidationReport:
        """
        Comprehensive pattern validation
        
        Args:
            pattern_data: Pattern configuration to validate
            test_filenames: Optional list of filenames to test against
            
        Returns:
            PatternValidationReport with validation results
        """
        results = []
        
        # Basic field validation
        results.extend(self._validate_required_fields(pattern_data))
        results.extend(self._validate_name(pattern_data.get('name', '')))
        results.extend(self._validate_regex_pattern(pattern_data.get('regex_pattern', '')))
        results.extend(self._validate_field_mapping(pattern_data.get('field_mapping', {})))
        results.extend(self._validate_priority(pattern_data.get('priority', 1)))
        
        # Advanced validation
        if pattern_data.get('regex_pattern') and pattern_data.get('field_mapping'):
            results.extend(self._validate_pattern_mapping_consistency(
                pattern_data['regex_pattern'], 
                pattern_data['field_mapping']
            ))
        
        # Performance validation
        if pattern_data.get('regex_pattern'):
            results.extend(self._validate_regex_performance(pattern_data['regex_pattern']))
        
        # Test against sample filenames if provided
        if test_filenames and pattern_data.get('regex_pattern'):
            results.extend(self._validate_against_samples(
                pattern_data['regex_pattern'],
                pattern_data.get('field_mapping', {}),
                test_filenames
            ))
        
        # Pattern quality analysis
        results.extend(self._analyze_pattern_quality(pattern_data))
        
        # Calculate overall score and validity
        score = self._calculate_validation_score(results)
        is_valid = not any(r.severity == ValidationSeverity.CRITICAL for r in results)
        
        return PatternValidationReport(
            is_valid=is_valid,
            score=score,
            results=results
        )
    
    def _validate_required_fields(self, pattern_data: Dict) -> List[ValidationResult]:
        """Validate required fields are present"""
        results = []
        required_fields = ['name', 'regex_pattern', 'field_mapping']
        
        for field in required_fields:
            if not pattern_data.get(field):
                results.append(ValidationResult(
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Required field '{field}' is missing or empty",
                    field=field,
                    code="MISSING_REQUIRED_FIELD"
                ))
        
        return results
    
    def _validate_name(self, name: str) -> List[ValidationResult]:
        """Validate pattern name"""
        results = []
        
        if not name:
            return results  # Already handled in required fields
        
        if len(name.strip()) < 3:
            results.append(ValidationResult(
                severity=ValidationSeverity.ERROR,
                message="Pattern name should be at least 3 characters long",
                field="name",
                suggestion="Use a more descriptive name",
                code="NAME_TOO_SHORT"
            ))
        
        if len(name) > 100:
            results.append(ValidationResult(
                severity=ValidationSeverity.ERROR,
                message="Pattern name exceeds maximum length of 100 characters",
                field="name",
                code="NAME_TOO_LONG"
            ))
        
        # Check for special characters that might cause issues
        if re.search(r'[<>:"/\\|?*]', name):
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Pattern name contains special characters that might cause issues",
                field="name",
                suggestion="Use alphanumeric characters and basic punctuation",
                code="NAME_SPECIAL_CHARS"
            ))
        
        return results
    
    def _validate_regex_pattern(self, regex_pattern: str) -> List[ValidationResult]:
        """Validate regex pattern syntax and structure"""
        results = []
        
        if not regex_pattern:
            return results  # Already handled in required fields
        
        # Test regex compilation
        try:
            compiled_regex = re.compile(regex_pattern)
        except re.error as e:
            results.append(ValidationResult(
                severity=ValidationSeverity.CRITICAL,
                message=f"Invalid regex syntax: {str(e)}",
                field="regex_pattern",
                suggestion="Fix the regular expression syntax",
                code="INVALID_REGEX_SYNTAX"
            ))
            return results
        
        # Check for common regex issues
        results.extend(self._check_regex_issues(regex_pattern))
        
        # Check for capturing groups
        group_count = compiled_regex.groups
        if group_count == 0:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Pattern has no capturing groups - no data will be extracted",
                field="regex_pattern",
                suggestion="Add parentheses around parts you want to extract: (.*)",
                code="NO_CAPTURING_GROUPS"
            ))
        
        return results
    
    def _check_regex_issues(self, pattern: str) -> List[ValidationResult]:
        """Check for common regex pattern issues"""
        results = []
        
        # Check for catastrophic backtracking patterns
        dangerous_patterns = [
            r'\(\.\*\)\+',  # (.*)+
            r'\(\.\*\)\*',  # (.*)*
            r'\(\.\+\)\+',  # (.+)+
            r'\(\.\+\)\*',  # (.+)*
        ]
        
        for dangerous in dangerous_patterns:
            if re.search(dangerous, pattern):
                results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR,
                    message="Pattern may cause catastrophic backtracking and poor performance",
                    field="regex_pattern",
                    suggestion="Use non-greedy quantifiers or more specific patterns",
                    code="CATASTROPHIC_BACKTRACKING"
                ))
                break
        
        # Check for overly broad patterns
        if pattern in ['.*', '.+', '(.*)']:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Pattern is too broad and will match everything",
                field="regex_pattern",
                suggestion="Make the pattern more specific to your use case",
                code="PATTERN_TOO_BROAD"
            ))
        
        # Check for unescaped special characters in likely literal contexts
        literal_chars = ['.', '+', '*', '?', '^', '$', '[', ']', '{', '}', '(', ')', '|', '\\']
        for char in literal_chars:
            if char in pattern and f'\\{char}' not in pattern:
                # This is a heuristic - may have false positives
                if char in ['.', '+', '*', '?']:
                    results.append(ValidationResult(
                        severity=ValidationSeverity.INFO,
                        message=f"Character '{char}' has special meaning in regex - escape with \\{char} if you want the literal character",
                        field="regex_pattern",
                        code="UNESCAPED_SPECIAL_CHAR"
                    ))
        
        return results
    
    def _validate_field_mapping(self, field_mapping: Dict) -> List[ValidationResult]:
        """Validate field mapping configuration"""
        results = []
        
        if not field_mapping:
            return results  # Already handled in required fields
        
        # Check if field_mapping is valid JSON if it's a string
        if isinstance(field_mapping, str):
            try:
                field_mapping = json.loads(field_mapping)
            except json.JSONDecodeError as e:
                results.append(ValidationResult(
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Field mapping is not valid JSON: {str(e)}",
                    field="field_mapping",
                    suggestion="Fix JSON syntax in field mapping",
                    code="INVALID_JSON"
                ))
                return results
        
        if not isinstance(field_mapping, dict):
            results.append(ValidationResult(
                severity=ValidationSeverity.CRITICAL,
                message="Field mapping must be a JSON object/dictionary",
                field="field_mapping",
                code="INVALID_MAPPING_TYPE"
            ))
            return results
        
        if not field_mapping:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Field mapping is empty - no fields will be extracted",
                field="field_mapping",
                suggestion="Add field mappings like {\"name\": \"$1:s$\"}",
                code="EMPTY_FIELD_MAPPING"
            ))
            return results
        
        # Validate individual field mappings
        for field_name, field_config in field_mapping.items():
            results.extend(self._validate_single_field_mapping(field_name, field_config))
        
        return results
    
    def _validate_single_field_mapping(self, field_name: str, field_config: Any) -> List[ValidationResult]:
        """Validate a single field mapping"""
        results = []
        
        # Check field name
        if not field_name or not isinstance(field_name, str):
            results.append(ValidationResult(
                severity=ValidationSeverity.ERROR,
                message="Field name must be a non-empty string",
                field="field_mapping",
                code="INVALID_FIELD_NAME"
            ))
            return results
        
        # Check field name format
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', field_name):
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message=f"Field name '{field_name}' should follow variable naming conventions",
                field="field_mapping",
                suggestion="Use alphanumeric characters and underscores, starting with a letter",
                code="INVALID_FIELD_NAME_FORMAT"
            ))
        
        # Validate field configuration
        if isinstance(field_config, str) and field_config.startswith('$') and field_config.endswith('$'):
            # Parse configuration like $1:s$
            config_content = field_config[1:-1]
            parts = config_content.split(':')
            
            if len(parts) < 1:
                results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid field configuration format for '{field_name}'",
                    field="field_mapping",
                    suggestion="Use format like $1:s$ for group 1 as string",
                    code="INVALID_FIELD_CONFIG"
                ))
            else:
                # Validate group number
                try:
                    group_num = int(parts[0])
                    if group_num < 0:
                        results.append(ValidationResult(
                            severity=ValidationSeverity.ERROR,
                            message=f"Group number cannot be negative in field '{field_name}'",
                            field="field_mapping",
                            code="NEGATIVE_GROUP_NUMBER"
                        ))
                except ValueError:
                    results.append(ValidationResult(
                        severity=ValidationSeverity.ERROR,
                        message=f"Group number must be an integer in field '{field_name}'",
                        field="field_mapping",
                        suggestion="Use format like $1:s$ where 1 is the group number",
                        code="INVALID_GROUP_NUMBER"
                    ))
                
                # Validate type specifier
                if len(parts) > 1:
                    type_spec = parts[1]
                    valid_types = ['s', 'd', 'f', 'b', 'date']
                    if type_spec not in valid_types:
                        results.append(ValidationResult(
                            severity=ValidationSeverity.WARNING,
                            message=f"Unknown type specifier '{type_spec}' for field '{field_name}'",
                            field="field_mapping",
                            suggestion=f"Use one of: {', '.join(valid_types)}",
                            code="UNKNOWN_TYPE_SPECIFIER"
                        ))
        
        return results
    
    def _validate_priority(self, priority: Any) -> List[ValidationResult]:
        """Validate priority value"""
        results = []
        
        if not isinstance(priority, int):
            results.append(ValidationResult(
                severity=ValidationSeverity.ERROR,
                message="Priority must be an integer",
                field="priority",
                suggestion="Use integer values like 1, 10, 100",
                code="INVALID_PRIORITY_TYPE"
            ))
            return results
        
        if priority < 0 or priority > 100:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Priority should be between 0 and 100",
                field="priority",
                suggestion="Use values between 0 (lowest) and 100 (highest)",
                code="PRIORITY_OUT_OF_RANGE"
            ))
        
        return results
    
    def _validate_pattern_mapping_consistency(
        self, 
        regex_pattern: str, 
        field_mapping: Dict
    ) -> List[ValidationResult]:
        """Validate consistency between regex pattern and field mapping"""
        results = []
        
        try:
            compiled_regex = re.compile(regex_pattern)
            max_groups = compiled_regex.groups
            
            # Check if field mappings reference valid groups
            for field_name, field_config in field_mapping.items():
                if isinstance(field_config, str) and field_config.startswith('$') and field_config.endswith('$'):
                    config_content = field_config[1:-1]
                    parts = config_content.split(':')
                    
                    if parts:
                        try:
                            group_num = int(parts[0])
                            if group_num > max_groups:
                                results.append(ValidationResult(
                                    severity=ValidationSeverity.ERROR,
                                    message=f"Field '{field_name}' references group {group_num} but pattern only has {max_groups} groups",
                                    field="field_mapping",
                                    suggestion=f"Use group numbers 1-{max_groups} or add more groups to the pattern",
                                    code="GROUP_OUT_OF_RANGE"
                                ))
                        except ValueError:
                            pass  # Already handled in field mapping validation
            
            # Check for unused groups
            used_groups = set()
            for field_config in field_mapping.values():
                if isinstance(field_config, str) and field_config.startswith('$') and field_config.endswith('$'):
                    config_content = field_config[1:-1]
                    parts = config_content.split(':')
                    if parts:
                        try:
                            used_groups.add(int(parts[0]))
                        except ValueError:
                            pass
            
            unused_groups = set(range(1, max_groups + 1)) - used_groups
            if unused_groups:
                results.append(ValidationResult(
                    severity=ValidationSeverity.INFO,
                    message=f"Pattern has unused capturing groups: {sorted(unused_groups)}",
                    field="field_mapping",
                    suggestion="Consider adding field mappings for these groups or remove unnecessary groups",
                    code="UNUSED_GROUPS"
                ))
        
        except re.error:
            pass  # Already handled in regex validation
        
        return results
    
    def _validate_regex_performance(self, regex_pattern: str) -> List[ValidationResult]:
        """Validate regex pattern for performance issues"""
        results = []
        
        # Check pattern length
        if len(regex_pattern) > 500:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Very long regex pattern may impact performance",
                field="regex_pattern",
                suggestion="Consider breaking into multiple simpler patterns",
                code="PATTERN_TOO_LONG"
            ))
        
        # Check for excessive alternation
        alternation_count = regex_pattern.count('|')
        if alternation_count > 10:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message=f"Pattern has many alternations ({alternation_count}) which may impact performance",
                field="regex_pattern",
                suggestion="Consider using character classes or simpler patterns",
                code="EXCESSIVE_ALTERNATION"
            ))
        
        # Check for nested quantifiers
        if re.search(r'[+*?]\s*[+*?]', regex_pattern):
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message="Pattern may have nested quantifiers which can cause performance issues",
                field="regex_pattern",
                suggestion="Review quantifier usage and make patterns more specific",
                code="NESTED_QUANTIFIERS"
            ))
        
        return results
    
    def _validate_against_samples(
        self,
        regex_pattern: str,
        field_mapping: Dict,
        test_filenames: List[str]
    ) -> List[ValidationResult]:
        """Test pattern against sample filenames"""
        results = []
        
        try:
            compiled_regex = re.compile(regex_pattern)
            matches = 0
            extraction_successes = 0
            
            for filename in test_filenames[:10]:  # Limit to first 10 samples
                match = compiled_regex.search(filename)
                if match:
                    matches += 1
                    
                    # Test field extraction
                    try:
                        from app.services.pattern_extraction_service import PatternExtractionService
                        service = PatternExtractionService(None, None, None, None, None)
                        
                        # Create temporary pattern object
                        from app.models.file_models import ExtractionPattern
                        temp_pattern = ExtractionPattern()
                        temp_pattern.regex_pattern = regex_pattern
                        temp_pattern.field_mapping = field_mapping
                        
                        extracted_data, score = service._apply_single_pattern(filename, temp_pattern)
                        if extracted_data and score > 0:
                            extraction_successes += 1
                            
                    except Exception:
                        pass  # Extraction failed for this sample
            
            match_rate = matches / len(test_filenames) * 100 if test_filenames else 0
            
            if matches == 0:
                results.append(ValidationResult(
                    severity=ValidationSeverity.WARNING,
                    message="Pattern does not match any of the test filenames",
                    field="regex_pattern",
                    suggestion="Adjust pattern to match your target filenames",
                    code="NO_SAMPLE_MATCHES"
                ))
            elif match_rate < 10:
                results.append(ValidationResult(
                    severity=ValidationSeverity.WARNING,
                    message=f"Pattern only matches {match_rate:.1f}% of test filenames",
                    field="regex_pattern",
                    suggestion="Consider making pattern more general if needed",
                    code="LOW_MATCH_RATE"
                ))
            elif match_rate > 90:
                results.append(ValidationResult(
                    severity=ValidationSeverity.INFO,
                    message=f"Pattern matches {match_rate:.1f}% of test filenames (very good!)",
                    field="regex_pattern",
                    code="HIGH_MATCH_RATE"
                ))
            
            # Check extraction success rate
            if matches > 0:
                extraction_rate = extraction_successes / matches * 100
                if extraction_rate < 50:
                    results.append(ValidationResult(
                        severity=ValidationSeverity.WARNING,
                        message=f"Field extraction succeeds for only {extraction_rate:.1f}% of matches",
                        field="field_mapping",
                        suggestion="Review field mapping configuration",
                        code="LOW_EXTRACTION_RATE"
                    ))
        
        except re.error:
            pass  # Already handled in regex validation
        except Exception as e:
            results.append(ValidationResult(
                severity=ValidationSeverity.WARNING,
                message=f"Could not test pattern against samples: {str(e)}",
                field="regex_pattern",
                code="SAMPLE_TEST_ERROR"
            ))
        
        return results
    
    def _analyze_pattern_quality(self, pattern_data: Dict) -> List[ValidationResult]:
        """Analyze overall pattern quality and provide recommendations"""
        results = []
        
        regex_pattern = pattern_data.get('regex_pattern', '')
        field_mapping = pattern_data.get('field_mapping', {})
        
        if not regex_pattern or not field_mapping:
            return results
        
        # Check for common filename pattern types
        pattern_suggestions = self._suggest_pattern_improvements(regex_pattern)
        results.extend(pattern_suggestions)
        
        # Analyze field mapping completeness
        mapping_suggestions = self._analyze_field_mapping_completeness(field_mapping)
        results.extend(mapping_suggestions)
        
        return results
    
    def _suggest_pattern_improvements(self, regex_pattern: str) -> List[ValidationResult]:
        """Suggest improvements for regex patterns"""
        results = []
        
        # Check for common filename patterns and suggest improvements
        suggestions = [
            {
                'pattern': r'^\.\*$',
                'message': "Consider using more specific patterns for better accuracy",
                'suggestion': "Use patterns like: ^(.+)_v(\\d+)\\.(\\w+)$ for versioned files"
            },
            {
                'pattern': r'\w+',
                'check': lambda p: '\\d' not in p and 'date' in str(p).lower(),
                'message': "Consider capturing dates with specific patterns",
                'suggestion': "Use \\d{4}-\\d{2}-\\d{2} for YYYY-MM-DD dates"
            }
        ]
        
        for suggestion in suggestions:
            if 'pattern' in suggestion and re.search(suggestion['pattern'], regex_pattern):
                results.append(ValidationResult(
                    severity=ValidationSeverity.INFO,
                    message=suggestion['message'],
                    field="regex_pattern",
                    suggestion=suggestion.get('suggestion'),
                    code="PATTERN_IMPROVEMENT_SUGGESTION"
                ))
        
        return results
    
    def _analyze_field_mapping_completeness(self, field_mapping: Dict) -> List[ValidationResult]:
        """Analyze field mapping for completeness and best practices"""
        results = []
        
        if not field_mapping:
            return results
        
        # Check for common missing fields
        common_fields = ['name', 'version', 'date', 'extension', 'type']
        present_fields = set(field_mapping.keys())
        
        # This is just informational
        suggested_fields = []
        if 'name' not in present_fields:
            suggested_fields.append('name')
        if any('version' in str(field).lower() for field in field_mapping.keys()) and 'version' not in present_fields:
            suggested_fields.append('version')
        
        if suggested_fields:
            results.append(ValidationResult(
                severity=ValidationSeverity.INFO,
                message=f"Consider adding common fields: {', '.join(suggested_fields)}",
                field="field_mapping",
                code="SUGGESTED_FIELDS"
            ))
        
        # Check field naming conventions
        for field_name in field_mapping.keys():
            if field_name.upper() == field_name:
                results.append(ValidationResult(
                    severity=ValidationSeverity.INFO,
                    message=f"Consider using lowercase for field '{field_name}'",
                    field="field_mapping",
                    suggestion="Use snake_case for field names",
                    code="FIELD_NAMING_CONVENTION"
                ))
        
        return results
    
    def _calculate_validation_score(self, results: List[ValidationResult]) -> int:
        """Calculate overall validation score (0-100)"""
        if not results:
            return 100
        
        score = 100
        
        for result in results:
            if result.severity == ValidationSeverity.CRITICAL:
                score -= 30
            elif result.severity == ValidationSeverity.ERROR:
                score -= 15
            elif result.severity == ValidationSeverity.WARNING:
                score -= 5
            elif result.severity == ValidationSeverity.INFO:
                score -= 1
        
        return max(0, score)
    
    def _load_common_patterns(self) -> Dict[str, str]:
        """Load common regex patterns for reference"""
        return {
            'versioned_file': r'^(.+)_v(\d+)\.(\w+)$',
            'dated_file': r'^(.+)_(\d{4}-\d{2}-\d{2})\.(\w+)$',
            'timestamped_file': r'^(.+)_(\d{4}\d{2}\d{2}_\d{2}\d{2}\d{2})\.(\w+)$',
            'categorized_file': r'^([A-Z]+)_(.+)\.(\w+)$',
            'numbered_file': r'^(.+?)_(\d+)\.(\w+)$'
        }
    
    def suggest_pattern_for_filenames(self, filenames: List[str]) -> Dict[str, Any]:
        """
        Analyze filenames and suggest patterns that might work
        
        Args:
            filenames: List of sample filenames
            
        Returns:
            Dict with suggested patterns and analysis
        """
        if not filenames:
            return {'suggestions': [], 'analysis': 'No filenames provided'}
        
        suggestions = []
        analysis = {
            'total_files': len(filenames),
            'extensions': self._analyze_extensions(filenames),
            'common_patterns': self._detect_common_patterns(filenames)
        }
        
        # Try common patterns against the filenames
        for pattern_name, pattern in self.common_patterns.items():
            matches = []
            for filename in filenames[:20]:  # Test first 20
                if re.match(pattern, filename):
                    matches.append(filename)
            
            if matches:
                match_rate = len(matches) / min(len(filenames), 20) * 100
                suggestions.append({
                    'pattern_name': pattern_name,
                    'regex_pattern': pattern,
                    'match_rate': match_rate,
                    'sample_matches': matches[:3],
                    'field_mapping': self._generate_field_mapping_for_pattern(pattern_name)
                })
        
        # Sort by match rate
        suggestions.sort(key=lambda x: x['match_rate'], reverse=True)
        
        return {
            'suggestions': suggestions[:5],  # Top 5 suggestions
            'analysis': analysis
        }
    
    def _analyze_extensions(self, filenames: List[str]) -> Dict[str, int]:
        """Analyze file extensions in the filename list"""
        extensions = {}
        for filename in filenames:
            parts = filename.split('.')
            if len(parts) > 1:
                ext = parts[-1].lower()
                extensions[ext] = extensions.get(ext, 0) + 1
        return dict(sorted(extensions.items(), key=lambda x: x[1], reverse=True))
    
    def _detect_common_patterns(self, filenames: List[str]) -> List[str]:
        """Detect common patterns in filenames"""
        patterns = []
        
        # Check for dates
        date_count = sum(1 for f in filenames if re.search(r'\d{4}-\d{2}-\d{2}', f))
        if date_count > len(filenames) * 0.3:
            patterns.append('contains_dates')
        
        # Check for versions
        version_count = sum(1 for f in filenames if re.search(r'_v\d+|version\d+', f))
        if version_count > len(filenames) * 0.3:
            patterns.append('contains_versions')
        
        # Check for timestamps
        timestamp_count = sum(1 for f in filenames if re.search(r'\d{8}_\d{6}', f))
        if timestamp_count > len(filenames) * 0.3:
            patterns.append('contains_timestamps')
        
        # Check for categories
        category_count = sum(1 for f in filenames if re.search(r'^[A-Z]+_', f))
        if category_count > len(filenames) * 0.3:
            patterns.append('has_categories')
        
        return patterns
    
    def _generate_field_mapping_for_pattern(self, pattern_name: str) -> Dict[str, str]:
        """Generate appropriate field mapping for known patterns"""
        mappings = {
            'versioned_file': {
                'name': '$1:s$',
                'version': '$2:d$',
                'extension': '$3:s$'
            },
            'dated_file': {
                'name': '$1:s$',
                'date': '$2:date$',
                'extension': '$3:s$'
            },
            'timestamped_file': {
                'name': '$1:s$',
                'timestamp': '$2:s$',
                'extension': '$3:s$'
            },
            'categorized_file': {
                'category': '$1:s$',
                'name': '$2:s$',
                'extension': '$3:s$'
            },
            'numbered_file': {
                'name': '$1:s$',
                'number': '$2:d$',
                'extension': '$3:s$'
            }
        }
        
        return mappings.get(pattern_name, {'extracted_text': '$1:s$'})


# Test utilities
class PatternTester:
    """Utility class for testing patterns against filenames"""
    
    def __init__(self, validation_service: PatternValidationService):
        self.validation_service = validation_service
    
    def test_pattern_comprehensively(
        self,
        pattern_data: Dict,
        test_filenames: List[str]
    ) -> Dict[str, Any]:
        """
        Comprehensive pattern testing including validation and performance
        
        Returns detailed test results with recommendations
        """
        # Validate pattern
        validation_report = self.validation_service.validate_pattern(
            pattern_data, test_filenames
        )
        
        # Test extraction performance
        extraction_results = self._test_extraction_performance(pattern_data, test_filenames)
        
        # Analyze results
        analysis = self._analyze_test_results(extraction_results)
        
        return {
            'validation': validation_report,
            'extraction_results': extraction_results,
            'analysis': analysis,
            'recommendations': self._generate_recommendations(validation_report, analysis)
        }
    
    def _test_extraction_performance(
        self, 
        pattern_data: Dict, 
        test_filenames: List[str]
    ) -> Dict[str, Any]:
        """Test extraction performance against filenames"""
        try:
            from app.services.pattern_extraction_service import PatternExtractionService
            service = PatternExtractionService(None, None, None, None, None)
            
            # Create temporary pattern
            from app.models.file_models import ExtractionPattern
            temp_pattern = ExtractionPattern()
            temp_pattern.regex_pattern = pattern_data['regex_pattern']
            temp_pattern.field_mapping = pattern_data['field_mapping']
            
            results = []
            total_time = 0
            
            for filename in test_filenames:
                start_time = time.time()
                try:
                    extracted_data, score = service._apply_single_pattern(filename, temp_pattern)
                    processing_time = (time.time() - start_time) * 1000  # ms
                    total_time += processing_time
                    
                    results.append({
                        'filename': filename,
                        'matched': extracted_data is not None,
                        'extraction_score': score,
                        'extracted_data': extracted_data,
                        'processing_time_ms': processing_time
                    })
                except Exception as e:
                    results.append({
                        'filename': filename,
                        'matched': False,
                        'error': str(e),
                        'processing_time_ms': (time.time() - start_time) * 1000
                    })
            
            return {
                'results': results,
                'total_files_tested': len(test_filenames),
                'successful_matches': sum(1 for r in results if r.get('matched', False)),
                'total_processing_time_ms': total_time,
                'average_processing_time_ms': total_time / len(test_filenames) if test_filenames else 0
            }
            
        except Exception as e:
            return {
                'error': f'Could not test extraction: {str(e)}',
                'results': []
            }
    
    def _analyze_test_results(self, extraction_results: Dict) -> Dict[str, Any]:
        """Analyze extraction test results"""
        if 'error' in extraction_results:
            return {'error': extraction_results['error']}
        
        results = extraction_results.get('results', [])
        if not results:
            return {'analysis': 'No test results available'}
        
        total_files = len(results)
        successful_matches = sum(1 for r in results if r.get('matched', False))
        
        return {
            'match_rate': successful_matches / total_files * 100 if total_files > 0 else 0,
            'average_extraction_score': sum(r.get('extraction_score', 0) for r in results if r.get('matched')) / max(successful_matches, 1),
            'performance_rating': self._rate_performance(extraction_results.get('average_processing_time_ms', 0)),
            'common_failures': self._analyze_failures(results)
        }
    
    def _rate_performance(self, avg_time_ms: float) -> str:
        """Rate extraction performance based on processing time"""
        if avg_time_ms < 1:
            return 'Excellent'
        elif avg_time_ms < 5:
            return 'Good'
        elif avg_time_ms < 20:
            return 'Fair'
        else:
            return 'Poor'
    
    def _analyze_failures(self, results: List[Dict]) -> List[str]:
        """Analyze common failure patterns"""
        failures = [r for r in results if not r.get('matched', False)]
        if not failures:
            return []
        
        # Analyze failure reasons
        error_types = {}
        for failure in failures:
            error = failure.get('error', 'No match')
            error_types[error] = error_types.get(error, 0) + 1
        
        return [f"{error}: {count} files" for error, count in error_types.items()]
    
    def _generate_recommendations(
        self, 
        validation_report: PatternValidationReport,
        analysis: Dict
    ) -> List[str]:
        """Generate recommendations based on validation and test results"""
        recommendations = []
        
        # Validation-based recommendations
        if validation_report.has_critical_issues():
            recommendations.append("Fix critical issues before using this pattern")
        
        if validation_report.score < 70:
            recommendations.append("Consider improving pattern quality - current score is low")
        
        # Performance-based recommendations
        if 'match_rate' in analysis and analysis['match_rate'] < 30:
            recommendations.append("Pattern matches very few files - consider making it more general")
        elif 'match_rate' in analysis and analysis['match_rate'] > 95:
            recommendations.append("Pattern matches almost all files - ensure it's not too broad")
        
        if 'performance_rating' in analysis and analysis['performance_rating'] in ['Fair', 'Poor']:
            recommendations.append("Pattern performance could be improved - consider simplifying regex")
        
        if not recommendations:
            recommendations.append("Pattern looks good! Consider testing with more diverse filenames")
        
        return recommendations
    
    def validate_pattern_security(self, regex_pattern: str, pattern_id: Optional[int] = None) -> Dict[str, Any]:
        """Enhanced security validation for regex patterns"""
        try:
            security_validator = get_pattern_validator()
            result = security_validator.validate_pattern_security(regex_pattern, pattern_id)
            
            return {
                'is_valid': result.is_valid,
                'message': result.message,
                'risk_score': result.risk_score,
                'details': result.details,
                'recommendations': self._generate_security_recommendations(result)
            }
            
        except Exception as e:
            logger.error(f"Security validation failed: {str(e)}")
            return {
                'is_valid': False,
                'message': f'Security validation error: {str(e)}',
                'risk_score': 1.0,
                'details': {'error': str(e)},
                'recommendations': ['Manual security review required']
            }
    
    def _generate_security_recommendations(self, security_result: SecurityValidationResult) -> List[str]:
        """Generate actionable security recommendations"""
        recommendations = []
        
        if not security_result.is_valid:
            if security_result.risk_score >= 0.9:
                recommendations.extend([
                    'Pattern has critical security issues - do not use in production',
                    'Consider completely rewriting the pattern with simpler logic',
                    'Test pattern thoroughly with large inputs before deployment'
                ])
            elif security_result.risk_score >= 0.7:
                recommendations.extend([
                    'Pattern has significant security concerns',
                    'Reduce pattern complexity by avoiding nested quantifiers',
                    'Consider using more specific character classes instead of .*'
                ])
            else:
                recommendations.extend([
                    'Pattern has minor security concerns',
                    'Review pattern for unnecessary complexity',
                    'Consider adding input length limits'
                ])
        
        if security_result.details:
            complexity = security_result.details.get('complexity_score', 0)
            if complexity > 0.6:
                recommendations.append('Simplify pattern to reduce computational complexity')
            
            if 'dangerous_constructs' in security_result.details:
                recommendations.append('Remove or replace dangerous regex constructs')
            
            if 'failed_tests' in security_result.details:
                recommendations.append('Pattern failed performance tests - optimize for speed')
        
        return recommendations
    
    def get_validation_recommendations(self, validation_report: PatternValidationReport) -> Dict[str, List[str]]:
        """Generate comprehensive recommendations from validation report"""
        recommendations = {
            'critical': [],
            'important': [],
            'suggested': [],
            'optimization': []
        }
        
        for result in validation_report.results:
            if result.suggestion:
                if result.severity == ValidationSeverity.CRITICAL:
                    recommendations['critical'].append(result.suggestion)
                elif result.severity == ValidationSeverity.ERROR:
                    recommendations['important'].append(result.suggestion)
                elif result.severity == ValidationSeverity.WARNING:
                    recommendations['suggested'].append(result.suggestion)
                else:
                    recommendations['optimization'].append(result.suggestion)
        
        return recommendations