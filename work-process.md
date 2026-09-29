# Work Process: 내가 실제로 이 일을 한 방식

AI 없이 손으로 했던 마지막 작업 흐름. "무엇을 위한 일인지"는 [story-service.md](story-service.md)에 따로 있다.

## 작업 문장

1. 나는 Uibowl에서 경쟁사 레퍼런스를 수집한다.
2. 레퍼런스를 토대로 분석하고 우리 서비스에 반영할 부분을 가져온다.
3. 분석 내용을 토대로 우리 서비스 화면 설계 문서를 구체화한다.
4. Figma에 레퍼런스와 화면설계서를 반영한 UI 키스크린 2~3개를 만든다. (web width 1440px)
5. PM과 Payments 팀이 기존 Payment Portal의 UAT 결과와 수정이 필요한 문제들을 나에게 전달한다. *(흐름 안 위치 미확정)*
6. 나는 기존 Figma 화면, 실제 구현된 화면, UAT 피드백과 회의 내용을 비교해서 서로 충돌하거나 불명확한 요구사항을 정리한다.
7. 나는 Payments Due, Clients, Payment Links가 각각 어떤 사용자 업무를 담당해야 하는지 다시 정의한다. 이때 Clients 페이지를 유지해야 하는지, account와 invoice 중 무엇을 중심 객체로 삼아야 하는지 멈칫한다.
8. 나는 검색, 필터, 정렬, account category, payment-link status와 archive 동작을 포함한 새로운 information architecture와 사용자 흐름을 Figma에서 설계한다.
9. 나는 account-level row, invoice detail, 명시적인 Archive action과 confirmation 등 여러 UI 옵션을 만들고 어떤 구조가 가장 명확한지 비교한다. 이때 financial status와 workflow status가 섞이지 않는지 다시 확인하며 멈칫한다.
10. 나는 수정한 Figma 화면과 interaction을 PM, Payments 팀과 엔지니어에게 공유하고, 요구사항과 기술적으로 가능한 동작이 맞는지 확인을 요청한다.
11. 나는 받은 피드백을 반영해 최종 화면과 상태를 수정하고, story mapping과 engineering handoff에 사용할 화면, 주석과 interaction rules를 정리한다.

## 산출물

| 문장 | 산출물 |
|---|---|
| 1 | 경쟁사 레퍼런스 모음 |
| 2–3 | 분석 + 화면 설계 문서 (하나로 합침) |
| 4 | UI 키스크린 2~3개 (Figma, 1440px) |
| 5 | UAT 결과 + 수정이 필요한 문제 목록 *(받는 것)* |
| 6 | 서로 충돌하거나 불명확한 요구사항 정리 |
| 7 | 페이지별 역할 정의 (Payments Due / Clients / Payment Links) |
| 8 | 새 IA와 사용자 흐름 |
| 9 | UI 옵션 비교안 |
| 10 | 공유용 Figma 화면과 interaction |
| 11 | 최종 화면과 상태, handoff용 화면, 주석, interaction rules |

## 게이트 (멈칫한 지점)

### 설계 결정 게이트 ("무엇으로 정할까?")

| 문장 | 게이트 |
|---|---|
| 7-a | Clients 페이지를 유지해야 하는가? |
| 7-b | 중심 객체를 account로 할까, invoice로 할까? |
| 9 | financial status와 workflow status가 섞이지 않았는가? |

### 진행 게이트 ("넘어가도 되나?")

| 위치 | 게이트 |
|---|---|
| 1번 뒤 | 레퍼런스를 이 정도 모으면 충분한가? |
| 9번 뒤, 10번 전 | PM, Payments 팀, 엔지니어에게 넘겨도 되는 수준인가? |

10번(기술적 가능성 확인 요청)은 게이트가 아니다.

## 경계 (다른 사람이나 도구로 넘어가는 지점)

| 문장 | 넘어가는 지점 | 방향 |
|---|---|---|
| 1 | 나 → Uibowl | 도구 |
| 4 | 설계 문서 → Figma | 도구 |
| 5 | PM, Payments 팀 → 나 | 들어옴 |
| 6 | 기존 Figma, 실제 구현 화면, UAT 피드백, 회의 내용 → 나 | 들어옴 (여러 출처) |
| 8 | 나 → Figma | 도구 |
| 10 | 나 → PM, Payments 팀, 엔지니어 | 나감 (확인 요청) |
| 11 | 피드백 → 나 → story mapping, engineering handoff | 들어온 뒤 다시 나감 |

## 미확정

- **5번 UAT 피드백이 들어오는 시점을 확정해야 한다.** 4번 키스크린 뒤에 오는지, 흐름 앞쪽에서 들어오는지 PM과 확인이 필요하다.
