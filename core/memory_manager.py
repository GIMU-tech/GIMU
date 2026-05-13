import json
import os

MEMORY_FILE = "memory/tasks.json"

# =========================
# 메모리 로드
# =========================

def load_tasks():

    if not os.path.exists(MEMORY_FILE):

        return []

    with open(MEMORY_FILE, "r", encoding="utf-8") as f:

        return json.load(f)

# =========================
# 메모리 저장
# =========================

def save_tasks(tasks):

    with open(MEMORY_FILE, "w", encoding="utf-8") as f:

        json.dump(tasks, f, ensure_ascii=False, indent=2)

# =========================
# 작업 추가
# =========================

def add_task(task):

    tasks = load_tasks()

    tasks.append({
        "task": task,
        "status": "pending"
    })

    save_tasks(tasks)

# =========================
# 작업 완료
# =========================

def complete_task(task_name):

    tasks = load_tasks()

    for task in tasks:

        if task["task"] == task_name:

            task["status"] = "completed"

    save_tasks(tasks)

# =========================
# 현재 작업 목록
# =========================

def get_pending_tasks():

    tasks = load_tasks()

    return [
        task for task in tasks
        if task["status"] == "pending"
    ]