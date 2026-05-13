// =========================
// Monaco Editor
// =========================

let editor;
let currentOpenedFile = null;

// =========================
// Monaco 로드
// =========================

require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {

    editor = monaco.editor.create(
        document.getElementById("editor"),
        {
            value: "# Welcome to AI IDE\n# Select a file from the explorer to begin editing.\n",
            language: "python",
            theme: "vs-dark",
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
            minimap: { enabled: false },
            padding: { top: 16 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "gutter",
            scrollBeyondLastLine: false,
            bracketPairColorization: { enabled: true }
        }
    );
});

// =========================
// 접힌 폴더 상태
// =========================

const collapsedFolders = {};

// =========================
// API 기본 URL
// =========================

const API_BASE = "http://127.0.0.1:8000";

// =========================
// 모달 시스템
// =========================

let modalResolve = null;

function showModal(title, subtitle, placeholder, initialValue) {

    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const modalSubtitle = document.getElementById("modalSubtitle");
    const modalInput = document.getElementById("modalInput");

    modalTitle.textContent = title;
    modalSubtitle.textContent = subtitle;
    modalInput.placeholder = placeholder || "";
    modalInput.value = initialValue || "";

    modal.classList.remove("hidden");

    setTimeout(() => modalInput.focus(), 50);

    return new Promise((resolve) => {
        modalResolve = resolve;
    });
}

function closeModal(value) {

    const modal = document.getElementById("modal");
    modal.classList.add("hidden");

    if (modalResolve) {
        modalResolve(value);
        modalResolve = null;
    }
}

// =========================
// 파일 생성
// =========================

async function createNewFile(parentPath = "") {

    const initial = parentPath ? (parentPath + "/") : "";

    const path = await showModal(
        "📄 새 파일",
        "workspace 내 파일 경로를 입력하세요",
        "example.py",
        initial
    );

    if (!path) return;

    try {

        const response = await fetch(
            `${API_BASE}/create-file`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ path: path })
            }
        );

        const data = await response.json();

        if (data.success) {
            addMessage("SYSTEM", `✅ 파일 생성: ${path}`, "system-msg");
            loadFiles();
        } else {
            addMessage("SYSTEM", `❌ 실패: ${data.error}`, "system-msg");
        }

    } catch (error) {
        console.error(error);
        addMessage("SYSTEM", "❌ 서버 연결 실패", "system-msg");
    }
}

// =========================
// 폴더 생성
// =========================

async function createNewFolder(parentPath = "") {

    const initial = parentPath ? (parentPath + "/") : "";

    const path = await showModal(
        "📁 새 폴더",
        "workspace 내 폴더 경로를 입력하세요",
        "my-folder",
        initial
    );

    if (!path) return;

    try {

        const response = await fetch(
            `${API_BASE}/create-folder`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ path: path })
            }
        );

        const data = await response.json();

        if (data.success) {
            addMessage("SYSTEM", `✅ 폴더 생성: ${path}`, "system-msg");
            loadFiles();
        } else {
            addMessage("SYSTEM", `❌ 실패: ${data.error}`, "system-msg");
        }

    } catch (error) {
        console.error(error);
        addMessage("SYSTEM", "❌ 서버 연결 실패", "system-msg");
    }
}

// =========================
// 메시지 전송
// =========================

async function sendMessage() {

    const input = document.getElementById("userInput");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    addMessage("YOU", message, "user");
    input.value = "";

    // AI 메시지 틀 먼저 생성
    const aiMessageElement = addMessage("AI", "<span class='thinking-status'>AI가 생각 중입니다... <span class='ai-timer'>0.0s</span></span>", "ai");
    const aiTextElement = aiMessageElement.querySelector(".message-text");
    
    let startTime = Date.now();
    let timerInterval = setInterval(() => {
        const timerElem = aiMessageElement.querySelector(".ai-timer");
        if (timerElem) {
            timerElem.innerText = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
        }
    }, 100);

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let cumulativeText = "";

        // 첫 청크가 도착하면 타이머 중지 및 상태 메시지 제거
        let firstChunkReceived = false;

        aiTextElement.innerHTML = ""; // 기존 대기 메시지 제거

        let lastProcessedLength = 0;
        let displayedText = "";
        let textQueue = "";
        let isAnimating = false;

        function startAnimation() {
            if (isAnimating) return;
            isAnimating = true;
            animate();
        }

        function animate() {
            if (textQueue.length > 0) {
                // 한 번에 8글자씩 출력 (매우 빠른 타자기 느낌)
                const batch = textQueue.substring(0, 8);
                textQueue = textQueue.substring(8);
                displayedText += batch;
                
                aiTextElement.innerHTML = displayedText.replace(/\n/g, "<br>");
                
                const chatBox = document.getElementById("chatBox");
                if (chatBox) {
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
                
                requestAnimationFrame(animate);
            } else {
                isAnimating = false;
                // 애니메이션 종료 시 한 번 더 스크롤 강제
                const chatBox = document.getElementById("chatBox");
                if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
            }
        }

        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            if (!firstChunkReceived && chunk.trim()) {
                firstChunkReceived = true;
                clearInterval(timerInterval);
                aiTextElement.innerHTML = ""; 
            }
            cumulativeText += chunk;
            buffer += chunk;
            
            // 라인 단위 처리 (마커 감지)
            if (buffer.includes("\n")) {
                const lines = buffer.split("\n");
                buffer = lines.pop(); // 마지막 미완성 라인은 다시 버퍼에

                for (const line of lines) {
                    if (line.includes("!!TOOL:")) {
                        try {
                            const jsonStr = line.split("!!TOOL:")[1].split("!!")[0];
                            const action = JSON.parse(jsonStr);
                            handleAITerminalSync(action, 'start');
                        } catch(e) {}
                        continue;
                    }
                    if (line.includes("!!RESULT:")) {
                        try {
                            const jsonStr = line.split("!!RESULT:")[1].split("!!")[0];
                            const res = JSON.parse(jsonStr);
                            handleAITerminalSync(res, 'end');
                        } catch(e) {}
                        continue;
                    }
                }
            }

            // 프론트엔드 노출용 텍스트 (마커 제거)
            const cleanedCumulative = cumulativeText
                .replace(/!!TOOL:.*?!!/g, "")
                .replace(/!!RESULT:.*?!!/g, "")
                .replace(/<\|channel>thought/g, "")
                .replace(/<\|thought\|>/g, "");

            textQueue = cleanedCumulative.substring(displayedText.length);
            startAnimation();
        }

        // 남은 텍스트가 있다면 즉시 출력 보장
        const finalCheck = setInterval(() => {
            if (textQueue.length === 0) {
                const cleanedFinal = cumulativeText
                    .replace(/!!TOOL:.*?!!/g, "")
                    .replace(/!!RESULT:.*?!!/g, "")
                    .replace(/<\|channel>thought/g, "")
                    .replace(/<\|thought\|>/g, "");
                aiTextElement.innerHTML = cleanedFinal.replace(/\n/g, "<br>");
                const chatBox = document.getElementById("chatBox");
                if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
                clearInterval(finalCheck);
            }
        }, 100);

        clearInterval(timerInterval);
        loadFiles(); // 모든 작업 종료 후 파일 트리 갱신

    } catch (error) {
        console.error(error);
        addMessage("SYSTEM", "❌ 서버 연결 실패", "system-msg");
    }
}

// =========================
// 메시지 출력
// =========================

function addMessage(sender, text, className) {

    const chatBox = document.getElementById("chatBox");
    const div = document.createElement("div");

    div.className = `message ${className}`;

    div.innerHTML = `
        <div class="message-header"><strong>${sender}</strong></div>
        <div class="message-text">${text.replace(/\n/g, "<br>")}</div>
    `;

    chatBox.appendChild(div);
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 50);

    return div;
}

// =========================
// 파일 로드
// =========================

async function loadFiles() {

    try {

        const response = await fetch(
            `${API_BASE}/files`
        );

        const data = await response.json();

        renderTree(data.items);

    } catch (error) {

        console.error(error);
    }
}

// =========================
// 트리 렌더링
// =========================

function renderTree(items) {

    const fileList =
        document.getElementById("fileList");

    fileList.innerHTML = "";

    items.forEach((item, index) => {

        if (isHiddenByCollapsed(item.path)) {
            return;
        }

        const div =
            document.createElement("div");

        div.className = "file-item";

        if (currentOpenedFile === item.path) {
            div.classList.add("active");
        }

        div.style.paddingLeft =
            `${item.depth * 16}px`;

        div.style.animationDelay =
            `${index * 0.02}s`;

        // 폴더
        if (item.type === "folder") {

            const collapsed =
                collapsedFolders[item.path];
            const icon = collapsed ? "📁" : "📂";

            div.innerHTML = `
                <div class="tree-left">
                    <span class="tree-arrow ${collapsed ? '' : 'open'}">❯</span>
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-name">${getName(item.path)}</span>
                </div>
                <div class="tree-actions">
                    <button class="action-btn" title="New File" onclick="event.stopPropagation(); createNewFile('${item.path}')">+F</button>
                    <button class="action-btn" title="New Folder" onclick="event.stopPropagation(); createNewFolder('${item.path}')">+D</button>
                </div>
            `;

            div.onclick = () => {
                collapsedFolders[item.path] =
                    !collapsedFolders[item.path];
                renderTree(items);
            };
        }

        // 파일
        else {
            const fileName = getName(item.path);
            const icon = getFileIcon(fileName);

            div.innerHTML = `
                <div class="tree-left">
                    <span class="file-spacer"></span>
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-name">${fileName}</span>
                </div>
            `;

            div.onclick = () =>
                openFile(item.path);
        }

        fileList.appendChild(div);
    });
}

// =========================
// 파일 아이콘 매핑
// =========================

function getFileIcon(ext) {
    return "";
}

// =========================
// 접힘 체크
// =========================

function isHiddenByCollapsed(path) {

    const parts = path.split("/");
    let current = "";

    for (let i = 0; i < parts.length - 1; i++) {
        current += (i === 0 ? "" : "/") + parts[i];

        if (collapsedFolders[current]) {
            return true;
        }
    }

    return false;
}

// =========================
// 이름 추출
// =========================

function getName(path) {

    const parts = path.split("/");
    return parts[parts.length - 1];
}

// =========================
// 파일 열기
// =========================

async function openFile(path) {

    try {

        const response = await fetch(
            `${API_BASE}/file?path=${encodeURIComponent(path)}`
        );

        const data = await response.json();

        currentOpenedFile = path;

        editor.setValue(data.content);

        // 언어 자동 감지
        const extension = path.split(".").pop();

        const langMap = {
            py: "python",
            js: "javascript",
            html: "html",
            css: "css",
            json: "json",
            md: "markdown",
            yml: "yaml",
            yaml: "yaml",
            sh: "shell",
            bat: "bat",
            txt: "plaintext"
        };

        const language = langMap[extension] || "plaintext";

        monaco.editor.setModelLanguage(
            editor.getModel(),
            language
        );

        // 헤더 업데이트
        const header =
            document.getElementById("currentFile");

        header.innerText = path;

        // 파일 트리 갱신 (활성 표시)
        loadFiles();

    } catch (error) {
        console.error(error);
    }
}

// =========================
// 파일 저장
// =========================

async function saveCurrentFile() {

    if (!currentOpenedFile) {
        addMessage("SYSTEM", "⚠️ 열린 파일이 없습니다.", "system-msg");
        return;
    }

    try {

        const content = editor.getValue();

        const response = await fetch(
            `${API_BASE}/save`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    path: currentOpenedFile,
                    content: content
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            addMessage(
                "SYSTEM",
                `✅ 저장 완료: ${currentOpenedFile}`,
                "system-msg"
            );
        } else {
            addMessage(
                "SYSTEM",
                `❌ 저장 실패: ${data.error}`,
                "system-msg"
            );
        }

    } catch (error) {
        console.error(error);
        addMessage("SYSTEM", "❌ 저장 실패", "system-msg");
    }
}

// =========================
// 터미널 실행
// =========================

async function runTerminalCommand(command) {
    // 1. 명령어를 출력창에 기록
    const output = document.getElementById("terminalOutput");
    const prompt = document.getElementById("terminalPrompt").innerText;
    
    const cmdLine = document.createElement("div");
    cmdLine.className = "terminal-line";
    cmdLine.innerHTML = `<span class="terminal-prompt">${prompt}</span> <span class="terminal-command-text">${command}</span>`;
    output.appendChild(cmdLine);

    try {
        const response = await fetch(`${API_BASE}/terminal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: command })
        });

        const data = await response.json();
        
        const resLine = document.createElement("div");
        resLine.className = `terminal-result ${data.success ? '' : 'terminal-error'}`;
        resLine.innerText = data.output || "";
        output.appendChild(resLine);

    } catch (error) {
        const errLine = document.createElement("div");
        errLine.className = "terminal-error";
        errLine.innerText = "❌ 실행 실패: 서버 연결 오류";
        output.appendChild(errLine);
    }

    const terminalBody = document.getElementById("terminalBody");
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

function handleAITerminalSync(data, phase) {
    const output = document.getElementById("terminalOutput");
    const terminalBody = document.getElementById("terminalBody");

    if (phase === 'start') {
        // AI가 명령을 실행함을 터미널에 표시
        const action = data.action || "action";
        const target = data.command || data.path || "";
        
        const line = document.createElement("div");
        line.className = "terminal-line ai-action";
        line.innerHTML = `<span class="terminal-prompt">AI@antigravity></span> <span class="terminal-command-text">[${action}] ${target}</span>`;
        output.appendChild(line);
    } else {
        // 결과 표시
        const resLine = document.createElement("div");
        resLine.className = `terminal-result ${data.success ? '' : 'terminal-error'}`;
        resLine.style.opacity = "0.7";
        resLine.innerText = data.output || (data.success ? "Done." : "Failed.");
        output.appendChild(resLine);
    }
    
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

// =========================
// 터미널 출력
// =========================

function addTerminalOutput(command, output, extraClass) {

    const terminal =
        document.getElementById("terminalOutput");

    const div =
        document.createElement("div");

    div.className = "terminal-line";

    div.innerHTML = `
        <div class="terminal-command">❯ ${command}</div>
        <div class="terminal-result ${extraClass || ''}">${output}</div>
    `;

    terminal.appendChild(div);

    terminal.scrollTop =
        terminal.scrollHeight;
}

// =========================
// 이벤트 리스너 등록
// =========================

function initializeEventListeners() {

    const userInput = document.getElementById("userInput");
    const sendButton = document.getElementById("sendButton");
    const saveButton = document.getElementById("saveButton");
    const refreshBtn = document.getElementById("refreshBtn");
    const newFileBtn = document.getElementById("newFileBtn");
    const newFolderBtn = document.getElementById("newFolderBtn");
    const modalCancel = document.getElementById("modalCancel");
    const modalConfirm = document.getElementById("modalConfirm");
    const modalInput = document.getElementById("modalInput");

    // 채팅 전송 (엔터)
    if (userInput) {
        userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }

    // 채팅 전송 (버튼)
    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }

    // 파일 저장
    if (saveButton) {
        saveButton.addEventListener("click", saveCurrentFile);
    }

    // 파일 새로고침
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadFiles);
    }

    // 새 파일
    if (newFileBtn) {
        newFileBtn.addEventListener("click", createNewFile);
    }

    // 새 폴더
    if (newFolderBtn) {
        newFolderBtn.addEventListener("click", createNewFolder);
    }

    // 모달 취소
    if (modalCancel) {
        modalCancel.addEventListener("click", () => closeModal(null));
    }

    // 모달 확인
    if (modalConfirm) {
        modalConfirm.addEventListener("click", () => {
            const val = document.getElementById("modalInput").value.trim();
            closeModal(val || null);
        });
    }

    // 모달 엔터 키
    if (modalInput) {
        modalInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const val = modalInput.value.trim();
                closeModal(val || null);
            }
        });
    }

    // 모달 오버레이 클릭 닫기
    const modal = document.getElementById("modal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal(null);
        });
    }

    // 터미널 엔터
    const terminalInput = document.getElementById("terminalInput");
    if (terminalInput) {
        terminalInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const command = terminalInput.value.trim();
                if (!command) return;
                runTerminalCommand(command);
                terminalInput.value = "";
            }
        });
    }

    // 키보드 단축키
    document.addEventListener("keydown", (e) => {
        // Ctrl+S 저장
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            saveCurrentFile();
        }
        // Escape 모달 닫기
        if (e.key === "Escape") {
            closeModal(null);
        }
    });

    // 리사이저 초기화
    initResizers();
}

// =========================
// 리사이저 (Panel Resizing)
// =========================

function initResizers() {
    const sidebar = document.getElementById("sidebar");
    const resizerSidebar = document.getElementById("resizer-sidebar");
    const chatPanel = document.getElementById("chatPanel");
    const resizerChat = document.getElementById("resizer-chat");
    const editorSection = document.getElementById("editorSection");
    const resizerTerminal = document.getElementById("resizer-terminal");

    // 1. Sidebar Resizer
    if (resizerSidebar && sidebar) {
        resizerSidebar.addEventListener("mousedown", (e) => {
            e.preventDefault();
            resizerSidebar.classList.add("active");
            document.addEventListener("mousemove", resizeSidebar);
            document.addEventListener("mouseup", stopResizeSidebar);
        });

        function resizeSidebar(e) {
            const width = e.clientX;
            if (width > 150 && width < 600) {
                sidebar.style.width = width + "px";
                if (editor) editor.layout();
            }
        }

        function stopResizeSidebar() {
            resizerSidebar.classList.remove("active");
            document.removeEventListener("mousemove", resizeSidebar);
            document.removeEventListener("mouseup", stopResizeSidebar);
        }
    }

    // 2. Chat Panel Resizer
    if (resizerChat && chatPanel) {
        resizerChat.addEventListener("mousedown", (e) => {
            e.preventDefault();
            resizerChat.classList.add("active");
            document.addEventListener("mousemove", resizeChat);
            document.addEventListener("mouseup", stopResizeChat);
        });

        function resizeChat(e) {
            const width = window.innerWidth - e.clientX;
            if (width > 250 && width < 800) {
                chatPanel.style.width = width + "px";
                if (editor) editor.layout();
            }
        }

        function stopResizeChat() {
            resizerChat.classList.remove("active");
            document.removeEventListener("mousemove", resizeChat);
            document.removeEventListener("mouseup", stopResizeChat);
        }
    }

    // 3. Editor/Terminal Resizer (Vertical)
    if (resizerTerminal && editorSection) {
        resizerTerminal.addEventListener("mousedown", (e) => {
            e.preventDefault();
            resizerTerminal.classList.add("active");
            document.addEventListener("mousemove", resizeTerminal);
            document.addEventListener("mouseup", stopResizeTerminal);
        });

        function resizeTerminal(e) {
            const containerTop = editorSection.getBoundingClientRect().top;
            const height = e.clientY - containerTop;
            if (height > 100 && height < window.innerHeight - 200) {
                editorSection.style.height = height + "px";
                if (editor) editor.layout();
            }
        }

        function stopResizeTerminal() {
            resizerTerminal.classList.remove("active");
            document.removeEventListener("mousemove", resizeTerminal);
            document.removeEventListener("mouseup", stopResizeTerminal);
        }
    }
}

// =========================
// 초기 실행
// =========================

initializeEventListeners();
loadFiles();
function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
        'js': '??', 'ts': '??', 'py': '??', 'html': '??', 
        'css': '??', 'md': '??', 'json': '??', 'txt': '??',
        'png': '???', 'jpg': '???', 'svg': '??', 'zip': '??'
    };
    return icons[ext] || '??';
}
