# 🎨 Design Guide: Minimal Pulse System

## 1. Design Concept: "Minimal Pulse"
사용자의 시선을 빼앗지 않으면서도, 시스템의 '생동감(Vitality)'을 전달하는 것을 목표로 합니다. 모든 상태는 선(Line)과 점(Dot)의 움직임으로 정의됩니다.

---

## 2. State-Specific Design Specs

### A. [Loading] - "The Thinking Pulse"
*상황: AI가 응답을 생성하거나 연산을 수행 중일 때*
- **Visual Logic:** 끊기지 않는 흐름 속에서 미세한 박동.
- **UI Element:** 
    - **Shape:** 텍스트 입력창 하단에 위치한 1px 높이의 아주 가는 선(Line).
    - **Animation:** 왼쪽에서 오른쪽으로 빛이 흐르는 듯한 그라데이션 이동(Linear Flow).
    - **Color:** `#6366F1` (Indigo) → `#A5B4FC` (Light Indigo)로 순환.
- **UX Detail:** 사용자가 '기다리는 중'임을 인지하되, 답답함을 느끼지 않을 정도의 부드러운 속도(1.5s cycle).

### B. [Processing] - "The Active Pulse"
*상황: 데이터가 전송 중이거나, 결과물이 조립 중일 때 (Loading보다 더 역동적임)*
- **Visual Logic:** 입자가 모이거나 흩어지는 움직임.
- **UI Element:** 
    담긴 텍스트 영역 내부에 아주 작은 점(Dot)들이 미세하게 진동.
    - **Shape:** 2px 크기의 작은 원형 점들.
    - **Animation:** 점들이 중앙으로 모였다가 다시 퍼지는(Breathing) 효과.
    - **Color:** `#8B5CF6` (Violet) 계열.
- **UX Detail:** 작업의 밀도가 높음을 시각적으로 암시.

### C. [Error] - "The Glitch Pulse"
*상황: 네트워크 단절, 문법 오류, 혹은 AI 응답 실패 시*
- **Visual Logic:** 흐름이 깨진 불연속적인 상태.
- **UI Element:** 
    - **Shape:** 텍스트 입력창 테두리(Border)가 붉은빛으로 깜빡임.
    - **Animation:** 짧고 날카로운 진동(Shake) 또는 끊기는 듯한 점멸(Strobe).
    - **Color:** `#EF4444` (Red) / `#F87171` (Light Red).
- **UX Detail:** 경고를 주되, '고쳐야 한다'는 느낌을 주는 명확한 대비.

### D. [Success/Done] - "The Settled Pulse"
*상황: 응답 생성이 완료되어 출력이 완료되었을 때*
- **Visual Logic:** 모든 에너지가 안정적으로 안착함.
- **UI Element:** 
    - **Shape:** 입력창 하단 바가 사라지거나, 옅은 체크 표시(Check)로 변환.
    - **Animation:** 부드럽게 사라지거나(Fade-out) 슥 훑고 지나가는 애니메이션.
    - **Color:** `#10B981` (Emerald)로 짧은 반짝임.
- **UX Detail:** 완료된 작업은 시각적 노이즈를 최소화하여 다시 다음 작업을 준비하게 함.

---

## 3. Design System Summary Table

| State | Visual Element | Motion Type | Color Hex |
| :--- | :--- | :--- | :--- |
| **Loading** | Thin Line (1px) | Linear Flow | `#6366F1` |
| **Processing** | Tiny Dots (2px) | Breathing | `#8B5CF6` |
| **Error** | Border / Sharp Pulse | Shake / Strobe | `#EF4444` |
| **Success** | Fade / Soft Glow | Dissolve | `#10B981` |