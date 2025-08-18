"""
Pattern Evaluation Service for automated pattern application
"""
import re
import time
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.file_models import IndexedFile, ExtractionPattern, PatternApplication
from app.services.pattern_extraction_service import PatternExtractionService


class PatternEvaluationService:
    """Service for evaluating pattern fitness and automatic application"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Initialize repositories for PatternExtractionService
        from app.repositories.file_repository import FileRepository
        from app.repositories.pattern_repository import (
            PatternRepository, PatternApplicationRepository, 
            PatternFailureRepository, PatternExtractionJobRepository
        )
        from app.repositories.selection_history_repository import PatternSelectionHistoryRepository
        
        file_repo = FileRepository(db)
        pattern_repo = PatternRepository(db)
        application_repo = PatternApplicationRepository(db)
        failure_repo = PatternFailureRepository(db)
        job_repo = PatternExtractionJobRepository(db)
        selection_history_repo = PatternSelectionHistoryRepository(db)
        
        self.pattern_service = PatternExtractionService(
            file_repo, pattern_repo, application_repo, 
            failure_repo, job_repo, selection_history_repo
        )
    
    def calculate_extraction_score(self, pattern: ExtractionPattern, file: IndexedFile) -> int:
        """
        Calculate extraction score for a pattern-file combination
        Score range: 0-100
        """
        try:
            # Check if pattern matches filename
            if not re.search(pattern.regex_pattern, file.filename):
                return 0
            
            # Extract data using pattern
            extracted_data, matched_pattern, score = self.pattern_service.extract_metadata_from_filename(
                file.filename, [pattern]  # Pass as list since the method expects List[ExtractionPattern]
            )
            
            if not extracted_data:
                return 0
            
            max_possible_fields = len(pattern.field_mapping)
            extracted_fields = len([v for v in extracted_data.values() if v is not None and v != ''])
            
            # Base score: 0-70 points based on extraction completeness
            base_score = (extracted_fields / max_possible_fields) * 70 if max_possible_fields > 0 else 0
            
            # Data quality bonus: 0-20 points
            quality_bonus = self._calculate_data_quality_bonus(extracted_data)
            
            # Completeness bonus: 0-10 points
            completeness_bonus = 10 if extracted_fields == max_possible_fields else 0
            
            total_score = min(100, int(base_score + quality_bonus + completeness_bonus))
            return total_score
            
        except Exception as e:
            print(f"Error calculating extraction score: {e}")
            return 0
    
    def _calculate_data_quality_bonus(self, extracted_data: Dict[str, Any]) -> int:
        """Calculate data quality bonus based on extracted data types and values"""
        bonus = 0
        
        for field_name, value in extracted_data.items():
            if value is None or value == '':
                continue
                
            # Type-based bonuses
            if isinstance(value, int) and value > 0:
                bonus += 2  # Valid integer
            elif isinstance(value, float) and value > 0:
                bonus += 2  # Valid float
            elif isinstance(value, str) and len(value) > 1:
                bonus += 1  # Non-empty string
                
            # Format-specific bonuses
            if field_name.lower() in ['date', 'created', 'modified'] and self._is_valid_date_format(str(value)):
                bonus += 2
            elif field_name.lower() in ['email'] and self._is_valid_email(str(value)):
                bonus += 2
            elif field_name.lower() in ['url', 'link'] and self._is_valid_url(str(value)):
                bonus += 2
        
        return min(20, bonus)
    
    def _is_valid_date_format(self, value: str) -> bool:
        """Check if value matches common date formats"""
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
            r'^\d{2}/\d{2}/\d{4}$',  # MM/DD/YYYY
            r'^\d{2}-\d{2}-\d{4}$',  # MM-DD-YYYY
        ]
        return any(re.match(pattern, value) for pattern in date_patterns)
    
    def _is_valid_email(self, value: str) -> bool:
        """Basic email validation"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, value))
    
    def _is_valid_url(self, value: str) -> bool:
        """Basic URL validation"""
        url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        return bool(re.match(url_pattern, value))
    
    def should_replace_pattern(self, current_app: Optional[PatternApplication], 
                             new_score: int, threshold: int = 70) -> bool:
        """
        Determine if a pattern should be replaced based on scoring
        """
        # No current pattern → apply if score meets threshold
        if not current_app:
            return new_score >= threshold
        
        # New pattern score below threshold → reject
        if new_score < threshold:
            return False
        
        # New pattern has higher score → apply
        if new_score > current_app.extraction_score:
            return True
        
        # Same or lower score → keep existing
        return False
    
    def evaluate_pattern_for_all_files(self, pattern_id: int, 
                                     apply_threshold: int = 70,
                                     file_filters: Dict = None) -> Dict[str, Any]:
        """
        Evaluate a pattern against all files and return summary
        """
        pattern = self.db.query(ExtractionPattern).filter(
            ExtractionPattern.id == pattern_id
        ).first()
        
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found")
        
        # Build file query with filters
        files_query = self.db.query(IndexedFile)
        
        if file_filters:
            if 'extension' in file_filters:
                files_query = files_query.filter(
                    IndexedFile.extension.in_(file_filters['extension'])
                )
            if 'path_contains' in file_filters:
                files_query = files_query.filter(
                    IndexedFile.path.contains(file_filters['path_contains'])
                )
        
        files = files_query.all()
        
        results = []
        will_apply = 0
        will_skip = 0
        no_change = 0
        
        for file in files:
            # Get current pattern application
            current_app = self.db.query(PatternApplication).filter(
                PatternApplication.file_id == file.id,
                PatternApplication.is_current == True
            ).first()
            
            # Calculate new score
            new_score = self.calculate_extraction_score(pattern, file)
            
            # Determine action
            should_apply = self.should_replace_pattern(current_app, new_score, apply_threshold)
            
            if should_apply:
                action = "will_apply"
                reason = f"Higher score ({new_score} > {current_app.extraction_score if current_app else 0})"
                will_apply += 1
            elif new_score < apply_threshold:
                action = "will_skip"
                reason = f"Below threshold ({new_score} < {apply_threshold})"
                will_skip += 1
            else:
                action = "no_change"
                reason = f"Score not improved ({new_score} ≤ {current_app.extraction_score if current_app else 0})"
                no_change += 1
            
            results.append({
                "file_id": file.id,
                "filename": file.filename,
                "current_pattern_id": current_app.pattern_id if current_app else None,
                "current_score": current_app.extraction_score if current_app else 0,
                "new_score": new_score,
                "action": action,
                "reason": reason
            })
        
        # Get top improvements
        top_improvements = sorted(
            [r for r in results if r["action"] == "will_apply"],
            key=lambda x: x["new_score"] - x["current_score"],
            reverse=True
        )[:10]
        
        return {
            "total_files": len(files),
            "evaluation_summary": {
                "will_apply": will_apply,
                "will_skip": will_skip,
                "no_change": no_change
            },
            "top_improvements": top_improvements,
            "all_results": results
        }
    
    def apply_pattern_to_files(self, pattern_id: int, 
                             file_ids: List[int] = None,
                             apply_threshold: int = 70,
                             force_apply: bool = False,
                             dry_run: bool = False) -> Dict[str, Any]:
        """
        Apply pattern to specified files or all applicable files
        """
        pattern = self.db.query(ExtractionPattern).filter(
            ExtractionPattern.id == pattern_id
        ).first()
        
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found")
        
        # Get files to process
        if file_ids:
            files = self.db.query(IndexedFile).filter(
                IndexedFile.id.in_(file_ids)
            ).all()
        else:
            files = self.db.query(IndexedFile).all()
        
        results = []
        applied_count = 0
        skipped_count = 0
        
        for file in files:
            start_time = time.time()
            
            # Get current pattern application
            current_app = self.db.query(PatternApplication).filter(
                PatternApplication.file_id == file.id,
                PatternApplication.is_current == True
            ).first()
            
            # Calculate new score
            new_score = self.calculate_extraction_score(pattern, file)
            
            # Determine if should apply
            should_apply = force_apply or self.should_replace_pattern(
                current_app, new_score, apply_threshold
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            if should_apply and not dry_run:
                # Deactivate current application
                if current_app:
                    current_app.is_current = False
                
                # Extract metadata
                extracted_data, matched_pattern, metadata_score = self.pattern_service.extract_metadata_from_filename(
                    file.filename, [pattern]  # Pass as list since the method expects List[ExtractionPattern]
                )
                
                # Create new application
                new_app = PatternApplication(
                    file_id=file.id,
                    pattern_id=pattern_id,
                    extraction_score=new_score,
                    extracted_data=extracted_data,
                    is_current=True,
                    processing_time_ms=processing_time
                )
                
                self.db.add(new_app)
                
                # Update file's pattern_id and extracted_data
                file.pattern_id = pattern_id
                file.extracted_data = extracted_data
                
                action = "applied"
                applied_count += 1
                
            elif should_apply and dry_run:
                action = "would_apply"
                applied_count += 1
            else:
                action = "skipped"
                skipped_count += 1
            
            results.append({
                "file_id": file.id,
                "filename": file.filename,
                "current_pattern_id": current_app.pattern_id if current_app else None,
                "current_score": current_app.extraction_score if current_app else 0,
                "new_score": new_score,
                "action": action,
                "reason": self._get_action_reason(current_app, new_score, apply_threshold, force_apply),
                "processing_time_ms": processing_time
            })
        
        if not dry_run:
            self.db.commit()
        
        return {
            "evaluated_files": len(files),
            "applied_files": applied_count,
            "skipped_files": skipped_count,
            "dry_run": dry_run,
            "results": results
        }
    
    def _get_action_reason(self, current_app: Optional[PatternApplication], 
                          new_score: int, threshold: int, force_apply: bool) -> str:
        """Get human-readable reason for action taken"""
        if force_apply:
            return "Force apply enabled"
        
        if not current_app:
            if new_score >= threshold:
                return f"No existing pattern, score meets threshold ({new_score} ≥ {threshold})"
            else:
                return f"Score below threshold ({new_score} < {threshold})"
        
        if new_score > current_app.extraction_score:
            return f"Higher score ({new_score} > {current_app.extraction_score})"
        elif new_score < threshold:
            return f"Below threshold ({new_score} < {threshold})"
        else:
            return f"Score not improved ({new_score} ≤ {current_app.extraction_score})"
    
    def get_pattern_effectiveness_stats(self, pattern_id: int) -> Dict[str, Any]:
        """
        Get effectiveness statistics for a pattern
        """
        # Get all applications of this pattern
        applications = self.db.query(PatternApplication).filter(
            PatternApplication.pattern_id == pattern_id
        ).all()
        
        if not applications:
            return {
                "total_applications": 0,
                "current_applications": 0,
                "avg_score": 0,
                "score_distribution": {}
            }
        
        current_apps = [app for app in applications if app.is_current]
        scores = [app.extraction_score for app in applications]
        
        # Score distribution
        score_ranges = {
            "0-20": 0, "21-40": 0, "41-60": 0, 
            "61-80": 0, "81-100": 0
        }
        
        for score in scores:
            if score <= 20:
                score_ranges["0-20"] += 1
            elif score <= 40:
                score_ranges["21-40"] += 1
            elif score <= 60:
                score_ranges["41-60"] += 1
            elif score <= 80:
                score_ranges["61-80"] += 1
            else:
                score_ranges["81-100"] += 1
        
        return {
            "total_applications": len(applications),
            "current_applications": len(current_apps),
            "avg_score": sum(scores) / len(scores) if scores else 0,
            "max_score": max(scores) if scores else 0,
            "min_score": min(scores) if scores else 0,
            "score_distribution": score_ranges
        }