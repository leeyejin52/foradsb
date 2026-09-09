# foradsb

원페이지 정적 사이트. 빌드 없음.

## 구조

- `index.html` 히어로(Nucleus 원 10개, 개별 번쩍임) → 이미지 격자 8장 → 푸터
- `assets/css/style.css`
- `assets/js/main.js` 원 10개가 각자 다른 타이밍으로 번개처럼 번쩍임(제자리 고정)
- `assets/img/hero/c01~c10.png` 원 10개(원본 Figma 02.pdf 3417:6135에서 분리), `text.png` 왼쪽 텍스트 기둥
- `assets/img/01.jpg` … `08.jpg` 프로젝트 대표 이미지 8장(4:5 권장, ≤500KB)

## 교체할 것

1. 이미지 5~8 업로드(파일명 유지)
2. `index.html` 푸터의 자기소개 더미 문단
