# foradsb

원페이지 정적 사이트. 빌드 없음.

## 구조

- `index.html` 히어로(스파크) → 이미지 격자 8장 → 푸터
- `assets/css/style.css`
- `assets/js/main.js` 스파크 번쩍임(불규칙 간격), 드문 전체 반전
- `assets/img/spark.svg` 히어로 그래픽 자리표시자. 스케치 스캔으로 교체
- `assets/img/01-siren.jpg` … `08-innocence.jpg` 프로젝트 대표 이미지 8장(4:5 권장, ≤500KB)

## 교체할 것

1. `assets/img/spark.svg` 를 스케치 스캔으로
2. 이미지 8장 업로드(파일명 유지)
3. `index.html` 푸터의 자기소개 더미 문단
4. Instagram · Behance · PDF 링크(`href="#"`)
