import os
import json
import subprocess

# =========================
# TOOL 실행
# =========================

def execute_tool_calls(tool_response):

    # TOOL_CALL: prefix is preferred, but we should try to parse if [ ] exists
    if "TOOL_CALL:" not in tool_response and "[" not in tool_response:
        return []

    try:
        # 1. TOOL_CALL: 키워드가 있다면 그 이후부터만 탐색
        content = tool_response
        if "TOOL_CALL:" in content:
            content = content.split("TOOL_CALL:", 1)[1]

        # 2. 마크다운 코드 블록 제거 및 정제
        if "```json" in content:
            content = content.split("```json", 1)[1].split("```", 1)[0]
        elif "```" in content:
            content = content.split("```", 1)[1].split("```", 1)[0]

        # 3. 실제 JSON 배열([ ])의 시작과 끝을 정밀하게 탐색
        start = content.find("[")
        end = content.rfind("]") + 1
        
        if start == -1 or end <= start:
             return []
             
        json_text = content[start:end].strip()
        actions = json.loads(json_text)
        
        if not isinstance(actions, list):
            actions = [actions]
            
    except Exception as e:
        return [{"success": False, "error": f"JSON Parsing Error: {str(e)}"}]

    results = []

    for action in actions:
        action_type = action.get("action")
        
        # 파라미터 추출 (평면 구조 또는 parameters 중첩 구조 대응)
        params = action.get("parameters", {}) if isinstance(action.get("parameters"), dict) else action
        
        target = params.get("path") or params.get("command") or action.get("path") or action.get("command")
        content = params.get("content", "") or action.get("content", "")
        
        result_entry = {
            "action": action_type,
            "target": target,
            "success": False,
            "output": ""
        }

        if not target and action_type != "list_files": # target이 필요한 명령어들
             result_entry["output"] = "Error: Missing 'path' or 'command' parameter."
             results.append(result_entry)
             continue

        try:
            # 폴더 생성
            if action_type == "create_folder":
                os.makedirs(target, exist_ok=True)
                result_entry["success"] = True
                result_entry["output"] = f"Folder created: {target}"

            # 파일 생성
            elif action_type == "create_file":
                folder = os.path.dirname(target)
                if folder:
                    os.makedirs(folder, exist_ok=True)
                
                with open(target, "w", encoding="utf-8") as f:
                    f.write(content)
                
                result_entry["success"] = True
                result_entry["output"] = f"File created: {target}"

            # 파일 수정
            elif action_type == "modify_file":
                if not os.path.exists(target):
                    result_entry["output"] = f"File not found: {target}"
                else:
                    with open(target, "w", encoding="utf-8") as f:
                        f.write(content)
                    result_entry["success"] = True
                    result_entry["output"] = f"File modified: {target}"

            # 터미널 실행
            elif action_type == "run_terminal":
                # Windows 환경을 고려하여 powershell 사용
                process = subprocess.run(
                    ["powershell.exe", "-Command", target],
                    capture_output=True,
                    text=True,
                    cwd=".",
                    timeout=15
                )
                result_entry["success"] = process.returncode == 0
                result_entry["output"] = (process.stdout + "\n" + process.stderr).strip()

            # 파일 읽기
            elif action_type == "read_file":
                if not os.path.exists(target):
                    result_entry["output"] = f"File not found: {target}"
                else:
                    with open(target, "r", encoding="utf-8") as f:
                        result_entry["output"] = f.read()
                        result_entry["success"] = True

            # 파일 목록 확인
            elif action_type == "list_files":
                target_path = target if target else "."
                if not os.path.exists(target_path):
                    result_entry["output"] = f"Path not found: {target_path}"
                else:
                    files = os.listdir(target_path)
                    result_entry["output"] = "\n".join(files)
                    result_entry["success"] = True

            else:
                result_entry["output"] = f"Unknown action: {action_type}"

        except subprocess.TimeoutExpired:
            result_entry["success"] = False
            result_entry["output"] = "Command timeout (15s)"
        except Exception as e:
            result_entry["success"] = False
            result_entry["output"] = str(e)

        results.append(result_entry)
        print(f"[{'SUCCESS' if result_entry['success'] else 'FAILED'}] {action_type}: {target}")

    return results