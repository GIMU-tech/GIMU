# 🛠️ Design Specification: Minimal Pulse (v1.0)
**Target:** Full-stack Developer (Bit)
**Subject:** AI IDE Status Feedback System

## 1. Design Concept: "Minimal Pulse"
사용자에게 'AI가 살아있음'을 알리되, 작업 흐름을 방해하지 않는 미세한 시각적 진동(Pulse)과 흐름(Flow)을 제공합니다. 과도한 그래픽보다는 빛(Glow)과 움직임(Motion)의 변화로 상태를 전달합니다.

---

## 2. Color & Visual System (Design Tokens)
모든 색상은 배경(Dark Mode 기반) 위에서 가독성을 확보하도록 설계되었습니다.

| State | Primary Color (Hex) | Glow/Shadow Color | Meaning |
| :--- | :--- | :--- | :--- |
| **Idle (Waiting)** | `#4B5563` (Gray-500) | `rgba(75, 85, 99, 0.2)` | 대기 중, 입력 대기 |
| **Processing (Thinking)** | `#3B82F6` (Blue-500) | `#60A5FA` (Blue-400) | AI가 사고 중 (Active) |
| **Success (Done)** | `#10B981` (Emerald-500) | `#34D399` (Emerald-400) | 작업 완료 / 응답 완료 |
| **Error (Failure)** | `#EF4444` (Red-500) | `#F87171` (Red-400) | 오류 발생 / 중단 |

---

## 3. Animation & Motion Specs
애니메이션은 `Ease-in-out`을 기본으로 하며, 프레임워크(Framer Motion/CSS) 구현 값을 명시합니다.

### A. Processing: The "Breathing" Pulse
*   **Description:** AI가 응답을 생성할 때, UI 요소(아이콘 혹은 프로그레스 바)가 부드럽게 커졌다 작아지는 효과.
*   **Duration:** 2000ms (Cycle)
*   **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`
*   **Implementation Detail:**
    - `scale`: 1.0 $\leftrightarrow$ 1.05
    - `opacity`: 0.6 $\leftrightarrow$ 1.0
    - `blur`: 0px $\leftrightarrow$ 4px (Glow 영역)

### B. Success: The "Flash" Effect
*   **Description:** 응답이 완료되는 순간, 짧고 경쾌한 빛의 번쩍임.
*   **Duration:** 400ms (Instant)
*   **Implementation Detail:**
    - `scale`: 1.0 $\rightarrow$ 1.1 $\rightarrow$ 1.0 (Snap back)
    - `opacity`: 1.0 $\rightarrow$ 0.5 $\rightarrow$ 1.0

### C. Error: The "Shake" Effect
*   **Description:** 오류 발생 시 사용자에게 주의를 주는 미세한 떨림.
*   **Duration:** 300ms
*   **Implementation Detail:**
    - `x-axis`: -4px $\rightarrow$ 4px $\rightarrow$ 0px
    - `Timing`: `elastic` 혹은 `step-wise`의 빠른 반복

---

## 4. Implementation Guide for Bit (Technical)

### 1) Component: Status Indicator (Icon/Dot)
- **Idle:** 정적 상태.
- **Processing:** `scale(1.05)`와 `opacity(0.7)`를 반복하는 `animate` 속성 적용.
- **Success:** 완료 시 `scale(1.1)`로 확장 후 즉시 복귀.

### 2) Component: Text/Input Border (Glow)
- AI가 응답 중일 때, 입력창(Input) 하단 혹은 테두리에 `box-shadow: 0 0 12px [Color]`를 사용하여 '생각 중'임을 암시.

## 5. Summary for Developer
- **Constraint:** 애니메이션은 절대 사용자의 시선을 뺏을 정도로 크면 안 됨. (Subtle is key)
- **Interaction:** 모든 상태 전환은 `transition`을 통해 부드럽게 이어져야 함.