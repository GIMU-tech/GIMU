import os
import subprocess
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from langchain_ollama import OllamaLLM

from backend.tool_executor import execute_tool_calls

# =========================
# CONFIGURATION
# =========================

def load_config():
    config_paths = ["antigravity.config.json", "config/antigravity.config.json"]
    for path in config_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[CONFIG ERROR] {e}")
    return {}

def load_agents():
    agents_dir = "agents"
    agent_contents = []
    if os.path.exists(agents_dir):
        for file in os.listdir(agents_dir):
            if file.endswith(".md"):
                try:
                    with open(os.path.join(agents_dir, file), "r", encoding="utf-8") as f:
                        agent_contents.append(f.read())
                except Exception as e:
                    print(f"[AGENT LOAD ERROR] {file}: {e}")
    return "\n\n".join(agent_contents)

config = load_config()
local_config = config.get("models", {}).get("local", {})

# =========================
# FastAPI
# =========================

app = FastAPI()

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# LLM
# =========================

base_url = local_config.get("baseUrl", "http://localhost:11434")
if base_url.endswith("/v1"):
    base_url = base_url[:-3]

llm = OllamaLLM(
    base_url=base_url,
    model=local_config.get("model", "hf.co/Jiunsong/supergemma4-26b-uncensored-gguf-v2:Q4_K_M"),
    num_predict=2048,
    temperature=0.1,
    num_ctx=8192
)

# =========================
# Base Directory
# =========================

BASE_DIR = "."
EXCLUDE_DIRS = {".venv", ".vscode", ".git", "__pycache__", "node_modules", "workspace"}

# =========================
# Request Models
# =========================

class ChatRequest(BaseModel):

    message: str

class SaveRequest(BaseModel):

    path: str
    content: str

class TerminalRequest(BaseModel):

    command: str

class CreateRequest(BaseModel):

    path: str
    content: str = ""

# =========================
# 응답 정리
# =========================

def clean_response(text):
    # 제거할 내부 태그 패턴들
    patterns = [
        "<|channel>thought",
        "<|channel|>",
        "<channel|>",
        "<|thought|>",
        "<|im_start|>",
        "<|im_end|>",
        "assistant\n",
        "thought\n"
    ]
    for p in patterns:
        text = text.replace(p, "")
    return text.strip()

# =========================
# ROOT
# =========================

@app.get("/")
def root():

    return {
        "status": "running"
    }

# =========================
# CHAT (Memory Management)
# =========================

chat_history = [] # Global memory

@app.post("/chat")
def chat(req: ChatRequest):

    def generate():
        global chat_history
        user_message = req.message
        agents_info = load_agents()

        # 최근 대화 기록 가져오기 (최대 10개)
        recent_history = chat_history[-10:] 
        history_str = "\n".join([f"{m['role']}: {m['content']}" for m in recent_history])

        current_prompt = user_message
        max_iterations = 3

        system_context = f"""
당신은 다음 4명의 전문가 에이전트로 구성된 AI 개발 팀입니다.
당신은 이 IDE 시스템 자체를 포함한 프로젝트 전체를 관리하고 수정할 수 있는 권한을 가지고 있습니다.

[현재 환경]
- 운영체제: Windows (터미널 사용 시 PowerShell 명령어 권장)
- 파일 탐색기 기준 디렉토리: 프로젝트 루트 (.)

[팀 구성원 프로필]
{agents_info}

[협업 프로세스 및 필수 규칙]
1. **분석 및 회의**: 요청을 받으면 현재 상황을 분석하고 계획을 세우세요.
2. **도구 사용 (필수)**: 파일을 생성하거나 수정할 때는 반드시 다음 형식을 사용하세요. 수정(modify_file) 전에는 반드시 read_file로 내용을 확인하세요.
3. **자율 수정**: 실행 결과 FAILED가 나오면 분석 후 다시 시도하세요.
4. **중요**: TOOL_CALL 키워드 뒤에 반드시 대괄호로 시작하는 JSON 배열을 넣으세요.

사용 가능한 TOOL action:
- list_files (path)
- read_file (path)
- create_folder (path)
- create_file (path, content)
- modify_file (path, content)
- run_terminal (command)

[예시]
사용자: hello.py 만들어줘
AI: 네, hello.py 파일을 생성하겠습니다.
TOOL_CALL: [ {{"action": "create_file", "path": "hello.py", "content": "print('hello world')"}} ]
"""

        for i in range(max_iterations):
            
            prompt = f"{system_context}\n\n[현재 대화 상태]\n{full_log}\n\n사용자 요청:\n{current_prompt}"
            
            yield f"\n[AI Turn {i+1}]\n"
            
            turn_response = ""
            print(f"[LLM REQUEST] Iteration {i+1} started.")
            # 스트리밍 호출
            for chunk in llm.stream(prompt):
                # 실시간으로 보내되, 불필요한 태그는 나중에 한꺼번에 정리된 텍스트로 로그에 쌓음
                turn_response += chunk
                print(f"[LLM CHUNK] {len(chunk)} chars received")
                yield chunk
            print(f"[LLM REQUEST] Iteration {i+1} finished.")
            
            turn_response = clean_response(turn_response)
            
            full_log += f"\n[AI Turn {i+1}]\n{turn_response}\n"

            # 도구 추출 (동기화를 위해)
            actions_to_run = []
            if "TOOL_CALL:" in turn_response or "[" in turn_response:
                try:
                    start = turn_response.find("[")
                    end = turn_response.rfind("]") + 1
                    if start != -1 and end > 0:
                        actions_to_run = json.loads(turn_response[start:end])
                        if not isinstance(actions_to_run, list):
                            actions_to_run = [actions_to_run]
                except:
                    pass

            # 프론트엔드 터미널 동기화를 위한 마커 전송
            for action in actions_to_run:
                 yield f"\n!!TOOL:{json.dumps(action)}!!\n"

            # 실제 도구 실행
            print(f"[TOOL EXECUTION] Running tools for turn {i+1}...")
            results = execute_tool_calls(turn_response)
            
            if not results:
                print("[TOOL EXECUTION] No tools found.")
                break

            results_summary = "\n[Execution Results]\n"
            all_success = True
            
            for res in results:
                # 결과 마커 전송
                yield f"\n!!RESULT:{json.dumps(res)}!!\n"

                status = "SUCCESS" if res.get("success") else "FAILED"
                action_name = res.get("action", "unknown")
                target_name = res.get("target", "none")
                
                line = f"- {status} | {action_name} | {target_name}\n"
                results_summary += line
                yield f"\n{line}" # 실시간으로 결과 출력
                
                output_msg = res.get("output") or res.get("error")
                if output_msg:
                    detail = f"  Detail: {output_msg}\n"
                    results_summary += detail
                    yield detail

                if not res.get("success"):
                    all_success = False

            full_log += results_summary

            if all_success:
                # 최종 답변을 히스토리에 저장
                chat_history.append({"role": "user", "content": user_message})
                chat_history.append({"role": "assistant", "content": turn_response})
                break
            else:
                current_prompt = "위의 실행 결과(FAILED)를 참고하여 문제를 해결하고 다시 시도하세요."

    return StreamingResponse(generate(), media_type="text/plain")

# =========================
# FILE TREE
# =========================

@app.get("/files")
def get_files():

    tree = []

    for root, dirs, files in os.walk(BASE_DIR):

        # 제외 폴더 필터링
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        relative_root = os.path.relpath(
            root,
            BASE_DIR
        )

        if relative_root == ".":
            relative_root = ""

        # 폴더
        for dir_name in dirs:

            path = os.path.join(
                relative_root,
                dir_name
            ).replace("\\", "/")

            depth = len(path.split("/")) if path else 0

            tree.append({
                "type": "folder",
                "path": path,
                "depth": depth
            })

        # 파일
        for file_name in files:

            path = os.path.join(
                relative_root,
                file_name
            ).replace("\\", "/")

            depth = len(path.split("/")) if path else 0

            tree.append({
                "type": "file",
                "path": path,
                "depth": depth
            })

    tree.sort(key=lambda x: x["path"])

    return {
        "items": tree
    }

# =========================
# FILE READ
# =========================

@app.get("/file")
def get_file(path: str):

    full_path = os.path.join(
        BASE_DIR,
        path.lstrip("/").lstrip("\\")
    )

    if not os.path.exists(full_path):

        return {
            "content": "파일 없음"
        }

    try:

        with open(
            full_path,
            "r",
            encoding="utf-8"
        ) as f:

            content = f.read()

        return {
            "content": content
        }

    except Exception as e:

        return {
            "content": str(e)
        }

# =========================
# FILE SAVE
# =========================

@app.post("/save")
def save_file(req: SaveRequest):

    full_path = os.path.join(
        BASE_DIR,
        req.path.lstrip("/").lstrip("\\")
    )

    try:

        with open(
            full_path,
            "w",
            encoding="utf-8"
        ) as f:

            f.write(req.content)

        return {
            "success": True
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }

# =========================
# CREATE FILE
# =========================

@app.post("/create-file")
def create_file(req: CreateRequest):

    full_path = os.path.join(
        BASE_DIR,
        req.path.lstrip("/").lstrip("\\")
    )

    try:

        folder = os.path.dirname(full_path)

        if folder:
            os.makedirs(folder, exist_ok=True)

        with open(
            full_path,
            "w",
            encoding="utf-8"
        ) as f:
            f.write(req.content)

        return {
            "success": True
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }

# =========================
# CREATE FOLDER
# =========================

@app.post("/create-folder")
def create_folder(req: CreateRequest):

    full_path = os.path.join(
        BASE_DIR,
        req.path.lstrip("/").lstrip("\\")
    )

    try:

        os.makedirs(full_path, exist_ok=True)

        return {
            "success": True
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }

# =========================
# TERMINAL COMMAND
# =========================

@app.post("/terminal")
def run_terminal(req: TerminalRequest):

    try:

        result = subprocess.run(
            ["powershell.exe", "-Command", req.command],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=BASE_DIR
        )

        output = result.stdout

        if result.stderr:
            output += "\n" + result.stderr

        return {
            "success": result.returncode == 0,
            "output": output.strip() or "(no output)"
        }

    except subprocess.TimeoutExpired:

        return {
            "success": False,
            "output": "명령 실행 시간 초과 (10초)"
        }

    except Exception as e:

        return {
            "success": False,
            "output": str(e)
        }