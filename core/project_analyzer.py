import os

# 읽을 확장자
CODE_EXTENSIONS = (
    ".py",
    ".js",
    ".ts",
    ".html",
    ".css",
    ".json",
    ".md"
)

# 무시할 폴더
IGNORE_DIRS = {
    "__pycache__",
    ".git",
    "node_modules",
    ".venv"
}


def analyze_project(root_path="workspace"):

    result = []

    # 프로젝트 전체 순회
    for root, dirs, files in os.walk(root_path):

        # 무시 폴더 제거
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        level = root.replace(root_path, "").count(os.sep)

        indent = "  " * level

        folder_name = os.path.basename(root)

        result.append(f"{indent}[폴더] {folder_name}")

        sub_indent = "  " * (level + 1)

        for file in files:

            file_path = os.path.join(root, file)

            result.append(f"{sub_indent}[파일] {file}")

            # 코드 파일만 읽기
            if file.endswith(CODE_EXTENSIONS):

                try:

                    with open(file_path, "r", encoding="utf-8") as f:

                        content = f.read(3000)

                    result.append(
                        f"{sub_indent}--- 코드 미리보기 시작 ---"
                    )

                    result.append(content)

                    result.append(
                        f"{sub_indent}--- 코드 미리보기 끝 ---"
                    )

                except Exception as e:

                    result.append(
                        f"{sub_indent}[파일 읽기 실패] {e}"
                    )

    return "\n".join(result)