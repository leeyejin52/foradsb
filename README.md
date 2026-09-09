# foradsb

원페이지 정적 사이트. 빌드 없음.

## 구조

- `index.html` 히어로(Nucleus 원 10개 드래그 인터랙션) → 이미지 격자 8장 → 푸터
- `assets/css/style.css`
- `assets/js/main.js` 원 드래그·관성·호버 확대·유휴 표류
- `assets/img/hero/c01~c10.png` 원 10개(원본 Figma 02.pdf 3417:6135에서 분리), `text.png` 왼쫙 텍스트 기둥
- `assets/img/01.jpg` … `08.jpg` 프로젝트 대표 이미지 8장(4:5 권장, ≤500KB)

## 교체할 것

1. 이미지 5~8 업로드(파일명 유지)
2. `index.html` 푸터의 자기소개 더미 문단
3. PDF 링크(`href="#"`)
