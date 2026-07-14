/* game2 project dashboard — vanilla JS, read-only renderer.
   기획 원본은 Markdown 문서이며, 이 스크립트는 docs/data/*.json을 표시만 한다. */

(function () {
  "use strict";

  var DATA = {
    project: "./data/project.json",
    milestones: "./data/milestones.json",
    tasks: "./data/tasks.json",
    documents: "./data/documents.json"
  };

  var BOARD_COLUMNS = [
    { key: "backlog", label: "Backlog" },
    { key: "todo", label: "Todo" },
    { key: "doing", label: "Doing" },
    { key: "review", label: "Review" },
    { key: "done", label: "Done" }
  ];

  var MILESTONE_STATUS_LABEL = {
    planned: "예정",
    active: "진행 중",
    completed: "완료",
    blocked: "차단됨"
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fetchJson(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) {
        throw new Error(path + " 응답 코드 " + res.status);
      }
      return res.json();
    });
  }

  function showError() {
    var banner = document.getElementById("error-banner");
    banner.textContent =
      "프로젝트 데이터를 불러오지 못했습니다. GitHub Pages 배포 상태 또는 JSON 경로를 확인하세요.";
    banner.hidden = false;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ---------- 4.1 / 4.6 project summary + next action ---------- */

  function renderProject(project, overallProgress) {
    setText("next-action-text", project.nextAction);
    setText("summary-phase", project.phase);
    setText("summary-milestone", project.currentMilestone);
    setText("summary-focus", project.currentFocus);
    setText("summary-updated", project.updatedAt);
    setText("phase-chip", project.phase);
    setText("summary-progress", overallProgress + "%");

    var meter = document.getElementById("summary-meter");
    meter.style.width = overallProgress + "%";
    document
      .getElementById("summary-meter-wrap")
      .setAttribute("aria-label", "전체 진행률 " + overallProgress + "%");

    var repoLink = document.getElementById("repo-link");
    repoLink.href = project.repositoryUrl;
  }

  /* ---------- 4.2 milestones ---------- */

  function renderMilestones(milestones) {
    var host = document.getElementById("milestone-list");
    host.innerHTML = milestones
      .map(function (m) {
        var doneCount = m.completionCriteria.filter(function (c) {
          return c.done;
        }).length;
        var total = m.completionCriteria.length;
        var statusLabel = MILESTONE_STATUS_LABEL[m.status] || m.status;
        var chipClass = m.status === "completed" ? "chip-done" : "chip-active";

        var items = m.completionCriteria
          .map(function (c) {
            return (
              '<li class="' + (c.done ? "criteria-done" : "criteria-open") + '">' +
              '<span class="criteria-mark" aria-hidden="true">' + (c.done ? "✓" : "○") + "</span>" +
              '<span><span class="criteria-title">' + esc(c.title) + "</span>" +
              '<span class="visually-hidden">' + (c.done ? " (완료)" : " (미완료)") + "</span>" +
              (c.evidence ? '<span class="criteria-evidence">근거: ' + esc(c.evidence) + "</span>" : "") +
              "</span></li>"
            );
          })
          .join("");

        return (
          '<article class="milestone-card">' +
          '<div class="milestone-head">' +
          "<h3>" + esc(m.title) + "</h3>" +
          '<span class="chip ' + chipClass + '">' + esc(statusLabel) + "</span>" +
          "</div>" +
          '<div class="milestone-progress-row">' +
          '<div class="meter" role="img" aria-label="진행률 ' + m.progress + '%">' +
          '<div class="meter-fill" style="width:' + m.progress + '%"></div></div>' +
          '<span class="milestone-progress-label">' + m.progress + "% · " + doneCount + "/" + total + " 완료</span>" +
          "</div>" +
          '<ul class="criteria-list">' + items + "</ul>" +
          "</article>"
        );
      })
      .join("");
  }

  /* ---------- 4.3 task board ---------- */

  function renderTasks(tasks, repositoryUrl) {
    var host = document.getElementById("task-board");
    host.innerHTML = BOARD_COLUMNS.map(function (col) {
      var cards = tasks.filter(function (t) {
        return t.status === col.key;
      });

      var body = cards.length
        ? cards
            .map(function (t) {
              var docLink = t.relatedDocument
                ? '<a class="task-doc" target="_blank" rel="noopener" href="' +
                  esc(repositoryUrl + "/blob/main/" + t.relatedDocument) + '">' +
                  esc(t.relatedDocument) + "</a>"
                : "";
              return (
                '<div class="task-card">' +
                '<p class="task-title">' + esc(t.title) + "</p>" +
                '<p class="task-meta">' +
                '<span class="task-category">' + esc(t.category) + "</span>" +
                docLink +
                "</p></div>"
              );
            })
            .join("")
        : '<p class="board-empty">비어 있음</p>';

      return (
        '<div class="board-col board-col-' + col.key + '">' +
        '<div class="board-col-head"><h3>' + col.label + "</h3>" +
        '<span class="board-count">' + cards.length + "</span></div>" +
        '<div class="board-cards">' + body + "</div></div>"
      );
    }).join("");
  }

  /* ---------- 4.5 documents ---------- */

  function renderDocuments(documents) {
    var host = document.getElementById("doc-table-body");
    host.innerHTML = documents
      .map(function (d) {
        return (
          "<tr>" +
          '<td class="doc-title">' + esc(d.title) + "</td>" +
          '<td class="doc-path">' + esc(d.path) + "</td>" +
          "<td><span class=\"chip\">" + esc(d.status) + "</span></td>" +
          "<td>" + esc(d.updatedAt) + "</td>" +
          '<td><a class="doc-link" target="_blank" rel="noopener" href="' +
          esc(d.githubUrl) + '">GitHub에서 열기 ↗</a></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  /* ---------- boot ---------- */

  Promise.all([
    fetchJson(DATA.project),
    fetchJson(DATA.milestones),
    fetchJson(DATA.tasks),
    fetchJson(DATA.documents)
  ])
    .then(function (results) {
      var project = results[0];
      var milestones = results[1];
      var tasks = results[2];
      var documents = results[3];

      // 전체 진행률: 마일스톤 진행률 평균 (근거 있는 완료 조건 기준)
      var overallProgress = milestones.length
        ? Math.round(
            milestones.reduce(function (sum, m) {
              return sum + (m.progress || 0);
            }, 0) / milestones.length
          )
        : 0;

      renderProject(project, overallProgress);
      renderMilestones(milestones);
      renderTasks(tasks, project.repositoryUrl);
      renderDocuments(documents);
    })
    .catch(function (err) {
      console.error(err);
      showError();
      setText("next-action-text", "—");
    });
})();
