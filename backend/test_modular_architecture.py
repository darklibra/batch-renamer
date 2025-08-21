#!/usr/bin/env python3
"""
Modular Architecture Test
새로운 모듈화 아키텍처 테스트 스크립트
"""

import sys
import os

# 백엔드 앱 경로를 Python 패스에 추가
backend_path = os.path.join(os.path.dirname(__file__), 'app')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

def test_di_container():
    """DI 컨테이너 테스트"""
    print("🧪 Testing DI Container...")
    
    try:
        from app.infrastructure.container import DIContainer
        from app.domain.pattern.interfaces.pattern_extractor_interface import PatternCacheInterface
        from app.domain.pattern.services.pattern_cache_manager import PatternCacheManager
        
        container = DIContainer()
        container.register_singleton(PatternCacheInterface, PatternCacheManager)
        
        # 서비스 해결 테스트
        cache_service = container.resolve(PatternCacheInterface)
        assert cache_service is not None
        
        # 싱글톤 테스트
        cache_service2 = container.resolve(PatternCacheInterface)
        assert cache_service is cache_service2
        
        print("✅ DI Container test passed")
        return True
        
    except Exception as e:
        print(f"❌ DI Container test failed: {e}")
        return False


def test_pattern_interfaces():
    """패턴 인터페이스 테스트"""
    print("🧪 Testing Pattern Interfaces...")
    
    try:
        from app.domain.pattern.interfaces.pattern_extractor_interface import (
            ExtractionResult, 
            PatternMatchResult
        )
        from app.domain.pattern.interfaces.pattern_validator_interface import (
            ValidationResult,
            SecurityRisk,
            PatternComplexityResult
        )
        
        # Value Object 생성 테스트
        extraction_result = ExtractionResult(
            success=True,
            extracted_data={'title': 'test'},
            pattern_id=1,
            extraction_score=0.8
        )
        
        match_result = PatternMatchResult(
            pattern_id=1,
            confidence_score=0.9,
            match_quality='excellent',
            matched_groups={'group1': 'test'}
        )
        
        validation_result = ValidationResult(
            is_valid=True,
            security_risk=SecurityRisk.NONE
        )
        
        complexity_result = PatternComplexityResult(
            complexity_score=0.3,
            estimated_performance='fast',
            dangerous_constructs=[],
            optimization_suggestions=[]
        )
        
        print("✅ Pattern Interfaces test passed")
        return True
        
    except Exception as e:
        print(f"❌ Pattern Interfaces test failed: {e}")
        return False


def test_pattern_services():
    """패턴 서비스 테스트"""
    print("🧪 Testing Pattern Services...")
    
    try:
        from app.domain.pattern.services.pattern_cache_manager import PatternCacheManager
        from app.domain.pattern.interfaces.pattern_extractor_interface import ExtractionResult
        
        # 캐시 매니저 테스트
        cache_manager = PatternCacheManager(max_cache_size=10, ttl_seconds=60)
        
        # 추출 결과 생성
        result = ExtractionResult(
            success=True,
            extracted_data={'title': 'test_file'},
            pattern_id=1,
            extraction_score=0.8
        )
        
        # 캐시 저장/조회 테스트
        cache_manager.set_cached_extraction('test.txt', 1, result)
        cached_result = cache_manager.get_cached_extraction('test.txt', 1)
        
        assert cached_result is not None
        assert cached_result.extracted_data['title'] == 'test_file'
        
        # 통계 테스트
        stats = cache_manager.get_cache_stats()
        assert 'extraction_cache_size' in stats
        
        print("✅ Pattern Services test passed")
        return True
        
    except Exception as e:
        print(f"❌ Pattern Services test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_configuration():
    """설정 테스트"""
    print("🧪 Testing Configuration...")
    
    try:
        from app.infrastructure.configuration import configure_pattern_domain_services
        from app.infrastructure.container import DIContainer
        from app.domain.pattern.interfaces.pattern_extractor_interface import PatternCacheInterface
        
        container = DIContainer()
        configure_pattern_domain_services(container)
        
        # 서비스들이 올바르게 등록되었는지 확인
        assert container.is_registered(PatternCacheInterface)
        
        # 서비스 해결 테스트
        cache_service = container.resolve(PatternCacheInterface)
        assert cache_service is not None
        
        print("✅ Configuration test passed")
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """메인 테스트 실행"""
    print("🚀 Starting Modular Architecture Tests\n")
    
    tests = [
        test_di_container,
        test_pattern_interfaces,
        test_pattern_services,
        test_configuration
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
        print()
    
    print(f"📊 Test Results:")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {passed}/{len(tests)} ({passed/len(tests)*100:.1f}%)")
    
    if failed == 0:
        print("\n🎉 All tests passed! Modular architecture is working correctly.")
        return True
    else:
        print("\n⚠️  Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)