class UseCaseException(Exception):
    """UseCase 처리 중 발생하는 예외"""
    pass

class PatternNotFoundException(UseCaseException):
    def __init__(self, message: str = "적용할 패턴을 찾을 수 없습니다."):
        super().__init__(message)

class FileNotFoundException(UseCaseException):
    def __init__(self, file_id: int):
        super().__init__(f"파일을 찾을 수 없습니다: {file_id}")

class FileProcessingException(UseCaseException):
    def __init__(self, message: str = "파일 처리 중 오류가 발생했습니다."):
        super().__init__(message)

class PatternAlreadyExistsException(UseCaseException):
    def __init__(self, name: str):
        super().__init__(f"패턴 이름이 이미 존재합니다: {name}")

class FileOperationException(UseCaseException):
    """파일 시스템 작업 중 발생하는 예외"""
    pass

class FileChangeRequestNotFoundException(UseCaseException):
    """파일 변경 요청을 찾을 수 없을 때 발생하는 예외"""
    pass
