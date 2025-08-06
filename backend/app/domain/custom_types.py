import orjson
from sqlalchemy.types import TypeDecorator, TEXT
from typing import Any, Optional, Dict

class JsonEncodedDict(TypeDecorator):
    """파이썬 dict를 orjson을 사용하여 JSON 문자열로 변환하여 데이터베이스에 저장합니다.
    
    SQLite와 같은 JSON을 네이티브로 지원하지 않는 DB를 위해 TEXT 타입으로 저장하며,
    데이터를 저장할 때 항상 UTF-8로 인코딩된 JSON 문자열로 변환합니다.
    """
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value: Optional[Dict[str, Any]], dialect: Any) -> Optional[str]:
        """Python dict -> JSON 문자열 (UTF-8)"""
        if value is not None:
            # orjson.dumps는 bytes를 반환하므로, TEXT 타입에 저장하기 위해 decode
            return orjson.dumps(value).decode('utf-8')
        return None

    def process_result_value(self, value: Optional[str], dialect: Any) -> Optional[Dict[str, Any]]:
        """JSON 문자열 -> Python dict"""
        if value is not None:
            try:
                return orjson.loads(value)
            except (orjson.JSONDecodeError, TypeError):
                return None
        return None
