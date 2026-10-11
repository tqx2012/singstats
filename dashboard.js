/**
 * SingStat Executive BI Dashboard Engine
 * Full-featured interactive drag-and-drop analytics platform.
 */

(function () {
  "use strict";

  // Application State
  const state = {
    datasets: [],
    catalog: [],
    activeDatasetId: null,
    activeDataset: null,
    theme: "light",
    activeVizType: "stacked_bar",
    shelves: {
      columns: [],
      rows: [],
      measures: [],
      color: [],
      filters: {} // fieldName -> Set of selected values
    },
    filterModalField: null,
    echartsInstance: null,
    searchQuery: "",
    activeStory: null,
    activeStoryChapterIndex: 0,
    storyModalTab: "all"
  };

  // DOM Elements
  const DOM = {
    datasetSelect: document.getElementById("dataset-select"),
    presetSelect: document.getElementById("preset-select"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    catalogBtn: document.getElementById("catalog-btn"),
    uploadBtn: document.getElementById("upload-btn"),
    fileInput: document.getElementById("file-input"),
    exportChartBtn: document.getElementById("export-chart-btn"),
    exportDataBtn: document.getElementById("export-data-btn"),
    clearAllBtn: document.getElementById("clear-all-btn"),
    swapAxesBtn: document.getElementById("swap-axes-btn"),

    // Story Elements
    storyHubBtn: document.getElementById("story-hub-btn"),
    storyBanner: document.getElementById("story-banner"),
    storySeverityBadge: document.getElementById("story-severity-badge"),
    storyBannerTitle: document.getElementById("story-banner-title"),
    storyChapterPills: document.getElementById("story-chapter-pills"),
    storyNarrativeText: document.getElementById("story-narrative-text"),
    storyKpiChips: document.getElementById("story-kpi-chips"),
    storyPrevBtn: document.getElementById("story-prev-btn"),
    storyNextBtn: document.getElementById("story-next-btn"),
    storyExitBtn: document.getElementById("story-exit-btn"),

    storyModal: document.getElementById("story-modal"),
    storyModalClose: document.getElementById("story-modal-close"),
    storyCardsGrid: document.getElementById("story-cards-grid"),
    storyTabBtns: document.querySelectorAll(".story-tab-btn"),

    fieldSearch: document.getElementById("field-search"),
    dimensionsList: document.getElementById("dimensions-list"),
    measuresList: document.getElementById("measures-list"),
    datasetDesc: document.getElementById("dataset-desc"),

    shelfColumns: document.getElementById("shelf-columns"),
    shelfRows: document.getElementById("shelf-rows"),
    shelfMeasures: document.getElementById("shelf-measures"),
    shelfColor: document.getElementById("shelf-color"),
    shelfFilters: document.getElementById("shelf-filters"),

    vizTypesBar: document.getElementById("viz-types-bar"),
    chartTitle: document.getElementById("chart-title"),
    chartSubtitle: document.getElementById("chart-subtitle"),
    chartContent: document.getElementById("chart-content"),
    echartsCanvas: document.getElementById("echarts-canvas"),
    pivotTableWrap: document.getElementById("pivot-table-wrap"),
    kpiGrid: document.getElementById("kpi-grid"),

    statusRecords: document.getElementById("status-records"),
    statusFiltered: document.getElementById("status-filtered"),
    statusExecution: document.getElementById("status-execution"),
    statusViz: document.getElementById("status-viz"),

    // Modals
    filterModal: document.getElementById("filter-modal"),
    filterModalTitle: document.getElementById("filter-modal-title"),
    filterSearch: document.getElementById("filter-search"),
    filterItemsList: document.getElementById("filter-items-list"),
    filterSelectAll: document.getElementById("filter-select-all"),
    filterClearAll: document.getElementById("filter-clear-all"),
    filterInvert: document.getElementById("filter-invert"),
    filterApplyBtn: document.getElementById("filter-apply-btn"),
    filterModalClose: document.getElementById("filter-modal-close"),

    catalogModal: document.getElementById("catalog-modal"),
    catalogModalClose: document.getElementById("catalog-modal-close"),
    catalogSearch: document.getElementById("catalog-search"),
    catalogResultsList: document.getElementById("catalog-results-list")
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    // 1. Load curated datasets from global window
    state.datasets = window.SINGSTAT_CURATED_DATASETS || [];
    state.catalog = window.SINGSTAT_CATALOG_SUMMARY || [];

    // 2. Setup ECharts instance
    initECharts();

    // 3. Populate dataset selector
    populateDatasetSelect();

    // 4. Setup event listeners & Drag and Drop
    setupEventListeners();
    setupDragAndDrop();

    // 5. Select first dataset & render
    if (state.datasets.length > 0) {
      selectDataset(state.datasets[0].id);
    }
  }

  function initECharts() {
    if (DOM.echartsCanvas && window.echarts) {
      state.echartsInstance = echarts.init(DOM.echartsCanvas, state.theme);
      window.addEventListener("resize", () => {
        if (state.echartsInstance) state.echartsInstance.resize();
      });
    }
  }

  function populateDatasetSelect() {
    DOM.datasetSelect.innerHTML = "";
    state.datasets.forEach(ds => {
      const opt = document.createElement("option");
      opt.value = ds.id;
      opt.textContent = ds.title;
      DOM.datasetSelect.appendChild(opt);
    });
  }

  // ==========================================================================
  // DATASET SWITCHING & PRESETS
  // ==========================================================================
  function selectDataset(datasetId) {
    const ds = state.datasets.find(d => d.id === datasetId);
    if (!ds) return;

    state.activeDatasetId = datasetId;
    state.activeDataset = ds;
    DOM.datasetSelect.value = datasetId;

    if (DOM.datasetDesc) {
      DOM.datasetDesc.textContent = `${ds.theme} • ${ds.subject} • ${ds.data.length.toLocaleString()} rows`;
    }

    // Reset shelves and apply default preset if available
    applyPreset(ds.defaultPreset || {});
    renderFieldList();
  }

  function applyPreset(preset) {
    state.shelves.columns = [];
    state.shelves.rows = [];
    state.shelves.measures = [];
    state.shelves.color = [];
    state.shelves.filters = {};

    if (preset.chartType) {
      setVizType(preset.chartType);
    }

    if (preset.xField) {
      const f = getField(preset.xField);
      if (f) {
        if (f.type === "measure") {
          state.shelves.measures.push({ ...f, agg: preset.xAgg || "sum" });
        } else {
          state.shelves.columns.push(f);
        }
      }
    }

    if (preset.yField) {
      const f = getField(preset.yField);
      if (f) {
        if (f.type === "measure") {
          state.shelves.measures.push({ ...f, agg: preset.yAgg || "sum" });
        } else {
          state.shelves.rows.push(f);
        }
      }
    }

    if (preset.colorField) {
      const f = getField(preset.colorField);
      if (f) state.shelves.color.push(f);
    }

    if (preset.filters) {
      for (const [k, vals] of Object.entries(preset.filters)) {
        state.shelves.filters[k] = new Set(vals);
      }
    }

    updateShelfUI();
    executeAndRender();
  }

  function getField(fieldName) {
    if (!state.activeDataset) return null;
    return state.activeDataset.fields.find(f => f.name === fieldName) || null;
  }

  // ==========================================================================
  // SIDEBAR FIELD PALETTE
  // ==========================================================================
  function renderFieldList() {
    if (!state.activeDataset) return;
    const filterText = state.searchQuery.toLowerCase();

    DOM.dimensionsList.innerHTML = "";
    DOM.measuresList.innerHTML = "";

    const dimensions = state.activeDataset.fields.filter(f => f.type === "dimension");
    const measures = state.activeDataset.fields.filter(f => f.type === "measure");

    dimensions
      .filter(f => !filterText || f.name.toLowerCase().includes(filterText))
      .forEach(f => {
        DOM.dimensionsList.appendChild(createFieldPill(f));
      });

    measures
      .filter(f => !filterText || f.name.toLowerCase().includes(filterText))
      .forEach(f => {
        DOM.measuresList.appendChild(createFieldPill(f));
      });
  }

  function createFieldPill(field) {
    const pill = document.createElement("div");
    pill.className = `field-pill ${field.type}`;
    pill.draggable = true;
    pill.dataset.fieldName = field.name;

    const icon = field.type === "dimension" ? (field.role === "time" ? "📅" : "🔤") : "#";

    pill.innerHTML = `
      <div class="field-pill-left">
        <span class="field-icon">${icon}</span>
        <span class="field-name">${escapeHtml(field.name)}</span>
      </div>
      <div class="field-actions">
        <button class="btn-pill-action btn-add-shelf" title="Quick Add to Shelf">+</button>
      </div>
    `;

    // Drag start
    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify(field));
      pill.style.opacity = "0.4";
    });

    pill.addEventListener("dragend", () => {
      pill.style.opacity = "1";
    });

    // Quick Add Button
    pill.querySelector(".btn-add-shelf").addEventListener("click", (e) => {
      e.stopPropagation();
      quickAddField(field);
    });

    return pill;
  }

  function quickAddField(field) {
    if (field.type === "dimension") {
      if (state.shelves.columns.length === 0) {
        state.shelves.columns.push(field);
      } else if (state.shelves.color.length === 0) {
        state.shelves.color.push(field);
      } else {
        state.shelves.rows.push(field);
      }
    } else {
      if (!state.shelves.measures.some(m => m.name === field.name)) {
        state.shelves.measures.push({ ...field, agg: field.defaultAgg || "sum" });
      }
    }
    updateShelfUI();
    executeAndRender();
  }

  // ==========================================================================
  // DRAG AND DROP SHELVES
  // ==========================================================================
  function setupDragAndDrop() {
    const dropzones = [
      { el: DOM.shelfColumns, shelf: "columns" },
      { el: DOM.shelfRows, shelf: "rows" },
      { el: DOM.shelfMeasures, shelf: "measures" },
      { el: DOM.shelfColor, shelf: "color" },
      { el: DOM.shelfFilters, shelf: "filters" }
    ];

    dropzones.forEach(({ el, shelf }) => {
      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        el.classList.add("drag-over");
      });

      el.addEventListener("dragleave", () => {
        el.classList.remove("drag-over");
      });

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("drag-over");
        const data = e.dataTransfer.getData("text/plain");
        if (!data) return;

        try {
          const field = JSON.parse(data);
          handleFieldDrop(field, shelf);
        } catch (err) {
          console.error("Drop parse error:", err);
        }
      });
    });
  }

  function handleFieldDrop(field, shelf) {
    if (shelf === "filters") {
      openFilterModal(field.name);
      return;
    }

    if (shelf === "measures") {
      if (field.type !== "measure") {
        alert("Only numeric measures can be placed in the Measures shelf.");
        return;
      }
      if (!state.shelves.measures.some(m => m.name === field.name)) {
        state.shelves.measures.push({ ...field, agg: field.defaultAgg || "sum" });
      }
    } else {
      // Dimensions shelves
      if (shelf === "color") {
        state.shelves.color = [field]; // max 1 color breakdown
      } else {
        const list = state.shelves[shelf];
        if (!list.some(f => f.name === field.name)) {
          list.push(field);
        }
      }
    }

    updateShelfUI();
    executeAndRender();
  }

  function updateShelfUI() {
    renderShelfPills(DOM.shelfColumns, state.shelves.columns, "columns");
    renderShelfPills(DOM.shelfRows, state.shelves.rows, "rows");
    renderShelfPills(DOM.shelfColor, state.shelves.color, "color");
    renderMeasurePills(DOM.shelfMeasures, state.shelves.measures);
    renderFilterPills(DOM.shelfFilters, state.shelves.filters);
  }

  function renderShelfPills(container, fields, shelfName) {
    container.innerHTML = "";
    if (fields.length === 0) {
      container.innerHTML = `<span class="shelf-empty-hint">Drop dimension here</span>`;
      return;
    }

    fields.forEach((field, idx) => {
      const pill = document.createElement("div");
      pill.className = `shelf-pill dimension`;
      pill.innerHTML = `
        <span>${escapeHtml(field.name)}</span>
        <button class="shelf-pill-remove" title="Remove">&times;</button>
      `;

      pill.querySelector(".shelf-pill-remove").addEventListener("click", () => {
        fields.splice(idx, 1);
        updateShelfUI();
        executeAndRender();
      });

      container.appendChild(pill);
    });
  }

  function renderMeasurePills(container, measures) {
    container.innerHTML = "";
    if (measures.length === 0) {
      container.innerHTML = `<span class="shelf-empty-hint">Drop numeric measure here</span>`;
      return;
    }

    measures.forEach((m, idx) => {
      const pill = document.createElement("div");
      pill.className = `shelf-pill measure`;
      pill.innerHTML = `
        <span class="shelf-pill-menu" title="Click to change aggregation">${m.agg.toUpperCase()} ▾</span>
        <span>${escapeHtml(m.name)}</span>
        <button class="shelf-pill-remove" title="Remove">&times;</button>
      `;

      // Cycle aggregation on click
      pill.querySelector(".shelf-pill-menu").addEventListener("click", () => {
        const aggs = ["sum", "avg", "min", "max", "count"];
        const nextIdx = (aggs.indexOf(m.agg) + 1) % aggs.length;
        m.agg = aggs[nextIdx];
        updateShelfUI();
        executeAndRender();
      });

      pill.querySelector(".shelf-pill-remove").addEventListener("click", () => {
        measures.splice(idx, 1);
        updateShelfUI();
        executeAndRender();
      });

      container.appendChild(pill);
    });
  }

  function renderFilterPills(container, filters) {
    container.innerHTML = "";
    const filterKeys = Object.keys(filters);
    if (filterKeys.length === 0) {
      container.innerHTML = `<span class="shelf-empty-hint">Drop field to filter data</span>`;
      return;
    }

    filterKeys.forEach(fieldName => {
      const selected = filters[fieldName];
      const pill = document.createElement("div");
      pill.className = `shelf-pill filter`;
      pill.innerHTML = `
        <span>${escapeHtml(fieldName)} (${selected.size})</span>
        <button class="shelf-pill-remove" title="Remove">&times;</button>
      `;

      // Click pill to edit filter
      pill.addEventListener("click", (e) => {
        if (!e.target.classList.contains("shelf-pill-remove")) {
          openFilterModal(fieldName);
        }
      });

      pill.querySelector(".shelf-pill-remove").addEventListener("click", (e) => {
        e.stopPropagation();
        delete filters[fieldName];
        updateShelfUI();
        executeAndRender();
      });

      container.appendChild(pill);
    });
  }

  // ==========================================================================
  // FILTER MODAL
  // ==========================================================================
  function openFilterModal(fieldName) {
    if (!state.activeDataset) return;
    state.filterModalField = fieldName;
    DOM.filterModalTitle.textContent = `Filter: ${fieldName}`;

    // Get all distinct values for field
    const valueCounts = new Map();
    state.activeDataset.data.forEach(row => {
      const val = row[fieldName] !== undefined ? String(row[fieldName]) : "(Blank)";
      valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
    });

    const allValues = Array.from(valueCounts.keys()).sort();
    let currentSelected = state.shelves.filters[fieldName];
    if (!currentSelected) {
      currentSelected = new Set(allValues);
    }

    renderFilterItemsList(allValues, valueCounts, currentSelected);
    DOM.filterSearch.value = "";
    DOM.filterModal.classList.add("active");
  }

  function renderFilterItemsList(allValues, valueCounts, currentSelected) {
    const search = DOM.filterSearch.value.toLowerCase();
    DOM.filterItemsList.innerHTML = "";

    allValues
      .filter(val => !search || val.toLowerCase().includes(search))
      .forEach(val => {
        const row = document.createElement("label");
        row.className = "filter-item-row";
        const isChecked = currentSelected.has(val);
        const count = valueCounts.get(val) || 0;

        row.innerHTML = `
          <input type="checkbox" value="${escapeHtml(val)}" ${isChecked ? "checked" : ""}>
          <span>${escapeHtml(val)}</span>
          <span style="margin-left:auto; color:var(--text-muted); font-size:11px;">${count}</span>
        `;

        row.querySelector("input").addEventListener("change", (e) => {
          if (e.target.checked) {
            currentSelected.add(val);
          } else {
            currentSelected.delete(val);
          }
        });

        DOM.filterItemsList.appendChild(row);
      });
  }

  function closeFilterModal() {
    DOM.filterModal.classList.remove("active");
    state.filterModalField = null;
  }

  // ==========================================================================
  // QUERY & AGGREGATION ENGINE
  // ==========================================================================
  function executeAndRender() {
    const startTime = performance.now();
    if (!state.activeDataset) return;

    // 1. Filter Data
    let filteredData = state.activeDataset.data;
    const filterEntries = Object.entries(state.shelves.filters);

    if (filterEntries.length > 0) {
      filteredData = filteredData.filter(row => {
        for (const [fName, allowedSet] of filterEntries) {
          const val = row[fName] !== undefined ? String(row[fName]) : "(Blank)";
          if (!allowedSet.has(val)) return false;
        }
        return true;
      });
    }

    // 2. Identify active axes
    const colField = state.shelves.columns[0] ? state.shelves.columns[0].name : null;
    const rowField = state.shelves.rows[0] ? state.shelves.rows[0].name : null;
    const colorField = state.shelves.color[0] ? state.shelves.color[0].name : null;
    const measures = state.shelves.measures;

    // Fallback: If no measure, use count
    const effectiveMeasures = measures.length > 0
      ? measures
      : [{ name: "Count", agg: "count", format: "integer" }];

    // 3. Group and aggregate
    const groupMap = new Map();

    filteredData.forEach(row => {
      const colVal = colField ? String(row[colField] ?? "All") : "All";
      const rowVal = rowField ? String(row[rowField] ?? "All") : "All";
      const colorVal = colorField ? String(row[colorField] ?? "All") : "All";

      const key = `${colVal}|||${rowVal}|||${colorVal}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          col: colVal,
          row: rowVal,
          color: colorVal,
          values: effectiveMeasures.map(() => [])
        });
      }

      const grp = groupMap.get(key);
      effectiveMeasures.forEach((m, idx) => {
        if (m.agg === "count") {
          grp.values[idx].push(1);
        } else {
          const v = parseFloat(row[m.name]);
          if (!isNaN(v)) grp.values[idx].push(v);
        }
      });
    });

    // 4. Compute Final Aggregations
    const aggregatedResults = [];
    groupMap.forEach(grp => {
      const record = {
        col: grp.col,
        row: grp.row,
        color: grp.color
      };

      effectiveMeasures.forEach((m, idx) => {
        const arr = grp.values[idx];
        let aggVal = null; // null = no valid data (renders as gap, not false zero)
        if (arr.length > 0) {
          if (m.agg === "sum" || m.agg === "count") {
            aggVal = arr.reduce((a, b) => a + b, 0);
          } else if (m.agg === "avg") {
            aggVal = arr.reduce((a, b) => a + b, 0) / arr.length;
          } else if (m.agg === "min") {
            aggVal = Math.min(...arr);
          } else if (m.agg === "max") {
            aggVal = Math.max(...arr);
          }
        }
        record[m.name] = aggVal;
      });

      aggregatedResults.push(record);
    });

    const elapsed = Math.round(performance.now() - startTime);

    // Update Status Bar
    DOM.statusRecords.textContent = `${state.activeDataset.data.length.toLocaleString()} rows`;
    DOM.statusFiltered.textContent = `${filteredData.length.toLocaleString()} rows filtered`;
    DOM.statusExecution.textContent = `${elapsed} ms`;
    DOM.statusViz.textContent = formatVizTitle(state.activeVizType);

    // Update Titles
    if (state.activeStory) {
      const ch = state.activeStory.chapters[state.activeStoryChapterIndex];
      DOM.chartTitle.textContent = `${state.activeStory.title} — ${ch ? ch.chapterTitle : ""}`;
      DOM.chartSubtitle.textContent = ch ? ch.narrative : `${state.activeDataset.title} • ${aggregatedResults.length} aggregated cells`;
    } else {
      const primaryMeasure = effectiveMeasures[0].name;
      DOM.chartTitle.textContent = `${effectiveMeasures[0].agg.toUpperCase()}(${primaryMeasure}) by ${colField || rowField || "Total"}${colorField ? " and " + colorField : ""}`;
      DOM.chartSubtitle.textContent = `${state.activeDataset.title} • ${aggregatedResults.length} aggregated cells`;
    }

    // 5. Render Visualization
    renderVisualization(aggregatedResults, colField, rowField, colorField, effectiveMeasures);
  }

  // ==========================================================================
  // VISUALIZATION RENDERERS
  // ==========================================================================
  function renderVisualization(data, colField, rowField, colorField, measures) {
    const isPivot = state.activeVizType === "pivot";
    const isKPI = state.activeVizType === "kpi";

    DOM.echartsCanvas.style.display = isPivot || isKPI ? "none" : "block";
    DOM.pivotTableWrap.style.display = isPivot ? "block" : "none";
    DOM.kpiGrid.style.display = isKPI ? "grid" : "none";

    if (isPivot) {
      renderPivotTable(data, colField, rowField, colorField, measures);
      return;
    }

    if (isKPI) {
      renderKPICards(data, measures);
      return;
    }

    if (!state.echartsInstance) return;

    // Build ECharts Options based on vizType
    const primaryMeasure = measures[0];
    const measureName = primaryMeasure.name;

    // Primary Axis Dimension (prefer col, then row)
    const axisDimension = colField || rowField || "col";
    const isHorizontal = state.activeVizType === "horizontal_bar";

    // Collect distinct X categories
    const categories = Array.from(new Set(data.map(d => axisDimension === colField ? d.col : d.row)));

    // Sort categories: if horizontal bar, sort by aggregated value ascending so highest is at the top
    if (isHorizontal) {
      const catTotals = new Map();
      categories.forEach(cat => {
        const items = data.filter(d => (axisDimension === colField ? d.col : d.row) === cat);
        const sumVal = items.reduce((acc, curr) => acc + (curr[measureName] || 0), 0);
        catTotals.set(cat, sumVal);
      });
      categories.sort((a, b) => (catTotals.get(a) || 0) - (catTotals.get(b) || 0));
    } else {
      categories.sort((a, b) => {
        const na = parseFloat(a);
        const nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
      });
    }

    // Breakdown Series (Color)
    const seriesCategories = colorField
      ? Array.from(new Set(data.map(d => d.color)))
      : [primaryMeasure.name];

    const chartColors = [
      "#1a73e8", "#34a853", "#f9ab00", "#ea4335", "#12b5cb",
      "#fa7b17", "#9334e6", "#f439a0", "#0097a7", "#4285f4"
    ];

    let option = {
      backgroundColor: "transparent",
      color: chartColors,
      tooltip: {
        trigger: state.activeVizType === "pie" ? "item" : "axis",
        confine: true,
        appendToBody: false,
        axisPointer: { type: "cross" },
        backgroundColor: state.theme === "dark" ? "#1e293b" : "#ffffff",
        borderColor: state.theme === "dark" ? "#334155" : "#dadce0",
        borderWidth: 1,
        extraCssText: "box-shadow: 0 4px 14px rgba(60,64,67,0.15); border-radius: 10px; padding: 10px 14px; max-width: 400px; white-space: normal;",
        textStyle: { color: state.theme === "dark" ? "#f8fafc" : "#202124", fontFamily: "'Google Sans Text', Roboto, sans-serif" }
      },
      legend: {
        show: seriesCategories.length > 1 || state.activeVizType === "pie",
        type: "scroll",
        top: 0,
        textStyle: { color: state.theme === "dark" ? "#94a3b8" : "#5f6368", fontFamily: "'Google Sans Text', Roboto, sans-serif", fontSize: 11.5 }
      },
      grid: {
        left: isHorizontal ? 170 : 60,
        right: 40,
        top: 50,
        bottom: 60,
        containLabel: true
      },
      toolbox: {
        feature: {
          saveAsImage: { title: "Save Image" },
          dataView: { title: "Data View", readOnly: true },
          restore: { title: "Restore" }
        },
        iconStyle: {
          borderColor: state.theme === "dark" ? "#94a3b8" : "#5f6368"
        }
      }
    };

    // PIE CHART
    if (state.activeVizType === "pie") {
      const pieData = categories.map(cat => {
        const items = data.filter(d => (axisDimension === colField ? d.col : d.row) === cat);
        const sumVal = items.reduce((acc, curr) => acc + (curr[measureName] || 0), 0);
        return { name: cat, value: round(sumVal, 2) };
      });

      option.series = [
        {
          name: measureName,
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: state.theme === "dark" ? "#1e293b" : "#ffffff",
            borderWidth: 2
          },
          data: pieData
        }
      ];
      state.echartsInstance.setOption(option, true);
      return;
    }

    // TREEMAP
    if (state.activeVizType === "treemap") {
      const treeData = categories.map(cat => {
        const items = data.filter(d => (axisDimension === colField ? d.col : d.row) === cat);
        const sumVal = items.reduce((acc, curr) => acc + (curr[measureName] || 0), 0);
        return { name: cat, value: round(sumVal, 2) };
      });

      option.series = [
        {
          type: "treemap",
          visibleMin: 300,
          label: { show: true, formatter: "{b}\n{c}", fontFamily: "'Google Sans Text', Roboto, sans-serif" },
          itemStyle: {
            borderColor: state.theme === "dark" ? "#1e293b" : "#ffffff",
            borderWidth: 2,
            gapWidth: 2
          },
          data: treeData
        }
      ];
      state.echartsInstance.setOption(option, true);
      return;
    }

    // CARTESIAN CHARTS (Bar, Line, Area, Stacked)
    const isStacked = state.activeVizType === "stacked_bar" || state.activeVizType === "percent_bar";
    const isPercent = state.activeVizType === "percent_bar";
    const isArea = state.activeVizType === "area";
    const isLine = state.activeVizType === "line" || isArea;

    // Axes
    const categoryAxis = {
      type: "category",
      data: categories,
      axisLabel: {
        color: state.theme === "dark" ? "#94a3b8" : "#5f6368",
        fontFamily: "'Google Sans Text', Roboto, sans-serif",
        fontSize: 11,
        interval: 0,
        rotate: categories.length > 12 && !isHorizontal ? 35 : 0
      },
      axisLine: { lineStyle: { color: state.theme === "dark" ? "#334155" : "#dadce0" } }
    };

    const valueAxis = {
      type: "value",
      axisLabel: {
        color: state.theme === "dark" ? "#94a3b8" : "#5f6368",
        fontFamily: "'Google Sans Text', Roboto, sans-serif",
        fontSize: 11,
        formatter: (val) => formatShortNumber(val, primaryMeasure.format)
      },
      splitLine: { lineStyle: { color: state.theme === "dark" ? "rgba(51, 65, 85, 0.4)" : "#f1f3f4" } }
    };

    if (isHorizontal) {
      option.xAxis = valueAxis;
      option.yAxis = categoryAxis;
    } else {
      option.xAxis = categoryAxis;
      option.yAxis = valueAxis;
      if (categories.length > 20) {
        option.dataZoom = [{ type: "slider", bottom: 10, height: 20 }];
      }
    }

    // Build Series Data
    // For percent_bar: first collect raw values per category so we can normalize
    const rawSeriesData = seriesCategories.map(sCat =>
      categories.map(cat => {
        const item = data.find(d =>
          (axisDimension === colField ? d.col : d.row) === cat &&
          (colorField ? d.color === sCat : true)
        );
        return item ? round(item[measureName], 2) : 0;
      })
    );

    // Per-category column totals (needed for percent_bar normalization)
    const colTotals = isPercent
      ? categories.map((_, ci) => rawSeriesData.reduce((sum, series) => sum + (series[ci] || 0), 0))
      : null;

    option.series = seriesCategories.map((sCat, si) => {
      const sData = isPercent
        ? rawSeriesData[si].map((v, ci) => {
            const total = colTotals[ci];
            return total > 0 ? round((v / total) * 100, 2) : 0;
          })
        : rawSeriesData[si];

      const sObj = {
        name: sCat,
        type: isLine ? "line" : "bar",
        data: sData,
        smooth: isLine,
        barMaxWidth: 36
      };

      if (isStacked) {
        sObj.stack = "total";
      }

      if (isArea) {
        sObj.areaStyle = { opacity: 0.3 };
      }

      return sObj;
    });

    // For percent_bar: override value axis to show 0–100% and use % formatter
    if (isPercent) {
      const pctAxis = {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: {
          color: state.theme === "dark" ? "#94a3b8" : "#5f6368",
          fontFamily: "'Google Sans Text', Roboto, sans-serif",
          fontSize: 11,
          formatter: val => `${val}%`
        },
        splitLine: { lineStyle: { color: state.theme === "dark" ? "rgba(51, 65, 85, 0.4)" : "#f1f3f4" } }
      };
      if (isHorizontal) option.xAxis = pctAxis;
      else option.yAxis = pctAxis;
    }

    // Story Annotations (markLine / markPoint for key policy & milestone events)
    if (state.activeStory && state.activeStory.chapters[state.activeStoryChapterIndex]) {
      const ch = state.activeStory.chapters[state.activeStoryChapterIndex];
      if (ch.annotations && option.series && option.series.length > 0) {
        if (ch.annotations.markLine) {
          option.series[0].markLine = ch.annotations.markLine;
        }
        if (ch.annotations.markPoint) {
          option.series[0].markPoint = ch.annotations.markPoint;
        }
      }
    }

    state.echartsInstance.setOption(option, true);

    // Deferred resize: layout may have changed (story banner show/hide, dataset switch)
    // so the chart container dimensions may be stale — resize after the DOM settles
    requestAnimationFrame(() => {
      if (state.echartsInstance) state.echartsInstance.resize();
    });
  }

  // ==========================================================================
  // PIVOT MATRIX TABLE RENDERER
  // ==========================================================================
  function renderPivotTable(data, colField, rowField, colorField, measures) {
    const colValues = Array.from(new Set(data.map(d => d.col))).sort();
    const rowValues = Array.from(new Set(data.map(d => d.row))).sort();
    const primaryMeasure = measures[0];

    let html = `<div class="pivot-table-wrap"><table class="pivot-table"><thead><tr>`;
    html += `<th>${rowField || "Row"}</th>`;

    colValues.forEach(cv => {
      html += `<th>${escapeHtml(cv)}</th>`;
    });
    html += `<th>Total</th></tr></thead><tbody>`;

    rowValues.forEach(rv => {
      html += `<tr><td><strong>${escapeHtml(rv)}</strong></td>`;
      let rowSum = 0;
      colValues.forEach(cv => {
        const cell = data.find(d => d.row === rv && d.col === cv);
        const val = cell ? cell[primaryMeasure.name] || 0 : 0;
        rowSum += val;
        html += `<td class="numeric">${formatNumber(val, primaryMeasure.format)}</td>`;
      });
      html += `<td class="numeric row-total">${formatNumber(rowSum, primaryMeasure.format)}</td></tr>`;
    });

    html += `</tbody></table></div>`;
    DOM.pivotTableWrap.innerHTML = html;
  }

  // ==========================================================================
  // KPI SCORECARD RENDERER
  // ==========================================================================
  function renderKPICards(data, measures) {
    let html = "";
    measures.forEach(m => {
      const vals = data.map(d => d[m.name] || 0).filter(v => !isNaN(v));
      const total = vals.reduce((a, b) => a + b, 0);
      const avg = vals.length > 0 ? total / vals.length : 0;
      const min = vals.length > 0 ? Math.min(...vals) : 0;
      const max = vals.length > 0 ? Math.max(...vals) : 0;

      html += `
        <div class="kpi-card">
          <div class="kpi-card-label">Total ${escapeHtml(m.name)}</div>
          <div class="kpi-card-value">${formatNumber(total, m.format)}</div>
          <div class="kpi-card-sub">Sum of all filtered records</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-label">Average ${escapeHtml(m.name)}</div>
          <div class="kpi-card-value">${formatNumber(avg, m.format)}</div>
          <div class="kpi-card-sub">Mean per observation</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-label">Min / Max Range</div>
          <div class="kpi-card-value" style="font-size:20px;">${formatShortNumber(min, m.format)} - ${formatShortNumber(max, m.format)}</div>
          <div class="kpi-card-sub">Observation span</div>
        </div>
      `;
    });

    DOM.kpiGrid.innerHTML = html;
  }

  // ==========================================================================
  // EVENT LISTENERS & CONTROLS
  // ==========================================================================
  function setupEventListeners() {
    // Dataset Select
    DOM.datasetSelect.addEventListener("change", (e) => {
      // Exit story mode when user manually switches dataset
      if (state.activeStory) {
        state.activeStory = null;
        state.activeStoryChapterIndex = 0;
        if (DOM.storyBanner) DOM.storyBanner.style.display = "none";
        DOM.presetSelect.value = "";
      }
      selectDataset(e.target.value);
      // Deferred resize after layout change
      setTimeout(() => {
        if (state.echartsInstance) state.echartsInstance.resize();
      }, 50);
    });

    // Preset Story Select
    DOM.presetSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) {
        exitStoryMode();
        return;
      }
      loadStory(val);
    });

    // Story Hub Modal Events
    if (DOM.storyHubBtn) {
      DOM.storyHubBtn.addEventListener("click", openStoryModal);
    }
    if (DOM.storyModalClose) {
      DOM.storyModalClose.addEventListener("click", closeStoryModal);
    }
    if (DOM.storyPrevBtn) {
      DOM.storyPrevBtn.addEventListener("click", prevStoryChapter);
    }
    if (DOM.storyNextBtn) {
      DOM.storyNextBtn.addEventListener("click", nextStoryChapter);
    }
    if (DOM.storyExitBtn) {
      DOM.storyExitBtn.addEventListener("click", exitStoryMode);
    }

    // Story Modal Filter Tabs
    DOM.storyTabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        DOM.storyTabBtns.forEach(b => b.classList.toggle("active", b === btn));
        state.storyModalTab = btn.dataset.tab;
        renderStoryModalCards(btn.dataset.tab);
      });
    });

    // Keyboard navigation for stories (Left / Right arrow keys)
    window.addEventListener("keydown", (e) => {
      if (!state.activeStory) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "ArrowRight") nextStoryChapter();
      else if (e.key === "ArrowLeft") prevStoryChapter();
    });

    // Viz Ribbon Buttons
    DOM.vizTypesBar.querySelectorAll(".viz-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setVizType(btn.dataset.viz);
        executeAndRender();
      });
    });

    // Theme Toggle
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        document.body.setAttribute("data-theme", state.theme);
        DOM.themeToggleBtn.textContent = state.theme === "dark" ? "☀️ Light" : "🌙 Dark";
        if (state.echartsInstance) {
          state.echartsInstance.dispose();
          initECharts();
        }
        executeAndRender();
      });
    }

    // Swap Axes Button
    if (DOM.swapAxesBtn) {
      DOM.swapAxesBtn.addEventListener("click", () => {
        const temp = state.shelves.columns;
        state.shelves.columns = state.shelves.rows;
        state.shelves.rows = temp;
        updateShelfUI();
        executeAndRender();
      });
    }

    // Clear All Shelves Button
    if (DOM.clearAllBtn) {
      DOM.clearAllBtn.addEventListener("click", () => {
        state.shelves.columns = [];
        state.shelves.rows = [];
        state.shelves.measures = [];
        state.shelves.color = [];
        state.shelves.filters = {};
        updateShelfUI();
        executeAndRender();
      });
    }

    // Export Chart
    if (DOM.exportChartBtn) {
      DOM.exportChartBtn.addEventListener("click", () => {
        if (state.echartsInstance) {
          const url = state.echartsInstance.getDataURL({ type: "png", pixelRatio: 2 });
          const a = document.createElement("a");
          a.href = url;
          a.download = `SingStat_${state.activeDatasetId}_chart.png`;
          a.click();
        }
      });
    }

    // Export Data CSV
    if (DOM.exportDataBtn) {
      DOM.exportDataBtn.addEventListener("click", () => {
        exportCurrentDataToCSV();
      });
    }

    // Field Search in Sidebar
    if (DOM.fieldSearch) {
      DOM.fieldSearch.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderFieldList();
      });
    }

    // Filter Modal Events
    if (DOM.filterModalClose) DOM.filterModalClose.addEventListener("click", closeFilterModal);
    if (DOM.filterSearch) {
      DOM.filterSearch.addEventListener("input", () => {
        if (state.filterModalField) openFilterModal(state.filterModalField);
      });
    }
    if (DOM.filterSelectAll) {
      DOM.filterSelectAll.addEventListener("click", () => {
        if (!state.filterModalField) return;
        const allVals = Array.from(new Set(state.activeDataset.data.map(d => String(d[state.filterModalField]))));
        state.shelves.filters[state.filterModalField] = new Set(allVals);
        openFilterModal(state.filterModalField);
      });
    }
    if (DOM.filterClearAll) {
      DOM.filterClearAll.addEventListener("click", () => {
        if (!state.filterModalField) return;
        state.shelves.filters[state.filterModalField] = new Set();
        openFilterModal(state.filterModalField);
      });
    }
    if (DOM.filterApplyBtn) {
      DOM.filterApplyBtn.addEventListener("click", () => {
        closeFilterModal();
        updateShelfUI();
        executeAndRender();
      });
    }

    // Catalog Search Modal Events
    if (DOM.catalogBtn) {
      DOM.catalogBtn.addEventListener("click", () => {
        DOM.catalogModal.classList.add("active");
        renderCatalogResults("");
      });
    }
    if (DOM.catalogModalClose) {
      DOM.catalogModalClose.addEventListener("click", () => {
        DOM.catalogModal.classList.remove("active");
      });
    }
    if (DOM.catalogSearch) {
      DOM.catalogSearch.addEventListener("input", (e) => {
        renderCatalogResults(e.target.value);
      });
    }

    // File Upload
    if (DOM.uploadBtn && DOM.fileInput) {
      DOM.uploadBtn.addEventListener("click", () => DOM.fileInput.click());
      DOM.fileInput.addEventListener("change", handleFileUpload);
    }
  }

  function setVizType(vizType) {
    state.activeVizType = vizType;
    DOM.vizTypesBar.querySelectorAll(".viz-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.viz === vizType);
    });
  }

  // ==========================================================================
  // STORIES REGISTRY (FOCUS: 2024-2026 SERIOUS ISSUES & FOUNDATIONAL TRENDS)
  // ==========================================================================
  const STORIES_REGISTRY = {
    scam_epidemic: {
      id: "scam_epidemic",
      title: "🚨 The Scam & Cybercrime Epidemic (3x Physical Crime)",
      subtitle: "Singapore's #1 National Security & Law Enforcement Crisis (2020–2026)",
      severity: "critical",
      severityLabel: "CRITICAL ISSUE (2024-2026)",
      category: "recent",
      summary: "While physical crime remains at record lows (~20k cases/year), digital scams exploded past 55,000 cases in 2024 (nearly 3x physical crime), with over $410M lost in H1 2026 alone. Singapore enacted the landmark Shared Responsibility Framework (SRF) and mandatory banking anti-malware protections.",
      datasetId: "crime_scams",
      chapters: [
        {
          chapterTitle: "1. The Great Crime Inversion",
          narrative: "Scams & cybercrimes exploded from 17,775 cases in 2020 to peak at 55,810 in 2024, completely overtaking traditional physical crime (19,969 cases).",
          kpis: [
            { label: "Scams & Cybercrimes (2024)", value: "55,810 cases", badge: "danger" },
            { label: "Physical Crime (2024)", value: "19,969 cases", badge: "safe" },
            { label: "Scams vs Physical Ratio", value: "2.8x Higher", badge: "warning" }
          ],
          preset: {
            chartType: "stacked_bar",
            xField: "Year",
            yField: "Value",
            yAgg: "sum",
            colorField: "Crime_Subtype",
            filters: {
              "Metric_Type": ["Cases Recorded"],
              "Crime_Subtype": ["Physical Crime Total", "Scams & Cybercrimes Total"]
            }
          },
          annotations: {
            markLine: {
              symbol: ["none", "none"],
              lineStyle: { type: "dashed", color: "#f87171", width: 2 },
              data: [{ xAxis: "2024", label: { formatter: "2024: Peak 55,810 Cases", color: "#f87171" } }]
            }
          }
        },
        {
          chapterTitle: "2. The Pure Scam Surge (+229%)",
          narrative: "Direct scam offenses alone rocketed from 15,651 to 51,501 cases by 2024, far outpacing commercial crime, theft, and crimes against persons.",
          kpis: [
            { label: "Scams Recorded (2024)", value: "51,501 cases", badge: "danger" },
            { label: "4-Year Scam Growth", value: "+229%", badge: "danger" },
            { label: "H1 2026 Dollar Loss", value: "$410M+ Lost", badge: "warning" }
          ],
          preset: {
            chartType: "line",
            xField: "Year",
            yField: "Value",
            yAgg: "sum",
            colorField: "Crime_Subtype",
            filters: {
              "Metric_Type": ["Cases Recorded"],
              "Crime_Subtype": ["Scams", "Commercial Crimes", "Crimes Against Persons", "Theft And Related Crimes"]
            }
          },
          annotations: {
            markPoint: {
              data: [{ type: "max", name: "Peak Scams", label: { formatter: "Peak 51,501" } }]
            }
          }
        },
        {
          chapterTitle: "3. Per-Capita Crime Rate Disparity",
          narrative: "Traditional physical crime rates fell to 331 per 100,000 residents, while the scam & cybercrime rate soared to 924 per 100,000.",
          kpis: [
            { label: "Physical Crime Rate", value: "331 / 100k", badge: "safe" },
            { label: "Scams & Cybercrime Rate", value: "924 / 100k", badge: "danger" },
            { label: "Rate Divergence", value: "+179% Higher", badge: "warning" }
          ],
          preset: {
            chartType: "bar",
            xField: "Year",
            yField: "Value",
            yAgg: "avg",
            colorField: "Crime_Subtype",
            filters: {
              "Metric_Type": ["Rate per 100k Population"],
              "Crime_Subtype": ["Physical Crime Rate", "Scams & Cybercrimes Rate"]
            }
          }
        }
      ]
    },

    fertility_crisis: {
      id: "fertility_crisis",
      title: "📉 TFR Plunge to Record 0.87 & Super-Aged Society 2026",
      subtitle: "Existential Demographic Challenge & The Silver Tsunami (1960–2026)",
      severity: "critical",
      severityLabel: "DEMOGRAPHIC CRUNCH",
      category: "society",
      summary: "Singapore officially crossed the UN threshold for a 'super-aged' society in 2026 with 21.4% of citizens aged 65 and above (19.5% of all residents). Simultaneously, the Total Fertility Rate plummeted to an unprecedented low of 0.87 in 2025/2026, with annual live births crashing below 30,000.",
      datasetId: "fertility_aging",
      chapters: [
        {
          chapterTitle: "1. 60-Year TFR Collapse to 0.87",
          narrative: "TFR fell below 1.0 in 2023 (0.97) and hit a historic trough of 0.87 in 2025. Chinese resident TFR fell to 0.70, Indian TFR to 0.92, and Malay TFR to 1.53.",
          kpis: [
            { label: "Overall TFR (2025)", value: "0.87 (Record Low)", badge: "danger" },
            { label: "Chinese Resident TFR", value: "0.70", badge: "danger" },
            { label: "Replacement Level", value: "2.10", badge: "safe" }
          ],
          preset: {
            chartType: "line",
            xField: "Year",
            yField: "Value",
            yAgg: "avg",
            colorField: "Series_Name",
            filters: {
              "Indicator_Group": ["Total Fertility Rate", "TFR by Ethnicity"]
            }
          },
          annotations: {
            markLine: {
              symbol: ["none", "none"],
              lineStyle: { type: "dashed", color: "#f87171", width: 2 },
              data: [{ xAxis: "2025", label: { formatter: "2025: Record 0.87 TFR", color: "#f87171" } }]
            }
          }
        },
        {
          chapterTitle: "2. The Baby Bust (Births Crash <30k)",
          narrative: "Total annual live births dropped below 30,000 for the first time in modern history (29,864 in 2025), with citizen births down to 26,071.",
          kpis: [
            { label: "Total Live Births (2025)", value: "29,864", badge: "danger" },
            { label: "Citizen Births (2025)", value: "26,071", badge: "danger" },
            { label: "Peak Births (1960)", value: "61,775", badge: "highlight" }
          ],
          preset: {
            chartType: "bar",
            xField: "Year",
            yField: "Value",
            yAgg: "sum",
            colorField: "Series_Name",
            filters: {
              "Indicator_Group": ["Live Birth Counts"],
              "Year": ["1980", "1990", "2000", "2010", "2015", "2020", "2021", "2022", "2023", "2024", "2025"]
            }
          }
        },
        {
          chapterTitle: "3. The Super-Aged Silver Tsunami (2026)",
          narrative: "Elderly resident share reached 19.5% (21.4% among citizens in 2026), and elderly living in one-person households crossed 88,400.",
          kpis: [
            { label: "Citizen Elderly (2026)", value: "21.4% (Super-Aged)", badge: "warning" },
            { label: "Resident Elderly (2026)", value: "19.5%", badge: "warning" },
            { label: "Seniors Living Alone", value: "88,400 persons", badge: "highlight" }
          ],
          preset: {
            chartType: "line",
            xField: "Year",
            yField: "Value",
            yAgg: "avg",
            colorField: "Series_Name",
            filters: {
              "Indicator_Group": ["Aging Population"]
            }
          }
        }
      ]
    },

    housing_million_dollar: {
      id: "housing_million_dollar",
      title: "🏘️ The Million-Dollar Era: HDB Resale Surge Past Index 203",
      subtitle: "Public Housing Affordability & Landmark Policy Interventions (1990–2026)",
      severity: "warning",
      severityLabel: "HOUSING AFFORDABILITY CRISIS",
      category: "economy",
      summary: "HDB resale prices broke consecutive quarterly records from 183.7 in 2024 Q1 past 203.7 in 2025/2026. MND and HDB responded with the October 2024 Standard/Plus/Prime framework (10-year MOP & clawbacks) and lowered HDB loan LTV limits to 75%.",
      datasetId: "property_price_index",
      chapters: [
        {
          chapterTitle: "1. HDB Resale Index Record Run Past 203",
          narrative: "The HDB resale price index doubled from its 2009 baseline (100) to cross 203 in 2025/2026, driven by million-dollar transactions across both mature and non-mature towns.",
          kpis: [
            { label: "HDB Resale Index (2026 Q2)", value: "202.8", badge: "warning" },
            { label: "2-Year Index Jump", value: "+10.4%", badge: "danger" },
            { label: "Base Year (1Q 2009)", value: "100.0", badge: "safe" }
          ],
          preset: {
            chartType: "line",
            xField: "Period",
            yField: "Index_Value",
            yAgg: "avg",
            colorField: "Property_Sector",
            filters: {
              "Property_Sector": ["HDB Resale Index"]
            }
          },
          annotations: {
            markLine: {
              symbol: ["none", "none"],
              lineStyle: { type: "dashed", color: "#fbbf24", width: 2 },
              data: [{ xAxis: "2024 4Q", label: { formatter: "Oct 2024: Plus/Prime Framework & 75% LTV", color: "#fbbf24" } }]
            }
          }
        },
        {
          chapterTitle: "2. Public vs Private Property Divergence",
          narrative: "Comparing price surges across sectors: Private Landed properties surged to 258.4, all Private Residential to 219.4, and HDB Resale to 202.8.",
          kpis: [
            { label: "Private Landed Index", value: "258.4", badge: "danger" },
            { label: "Private Residential All", value: "219.4", badge: "warning" },
            { label: "HDB Resale Index", value: "202.8", badge: "highlight" }
          ],
          preset: {
            chartType: "line",
            xField: "Period",
            yField: "Index_Value",
            yAgg: "avg",
            colorField: "Property_Sector",
            filters: {
              "Property_Sector": ["HDB Resale Index", "Private Residential All", "Private Landed", "Private Non-Landed"]
            }
          }
        },
        {
          chapterTitle: "3. Post-2020 Growth Acceleration",
          narrative: "Post-pandemic housing price velocity remained elevated despite higher borrowing costs, cooling packages, and accelerated BTO completions.",
          kpis: [
            { label: "2020 Q1 HDB Index", value: "131.5", badge: "safe" },
            { label: "2026 Q2 HDB Index", value: "202.8", badge: "danger" },
            { label: "5-Year Total Gain", value: "+54.2%", badge: "warning" }
          ],
          preset: {
            chartType: "bar",
            xField: "Period",
            yField: "Index_Value",
            yAgg: "avg",
            colorField: "Property_Sector",
            filters: {
              "Property_Sector": ["HDB Resale Index"],
              "Year": ["2020", "2021", "2022", "2023", "2024", "2025", "2026"]
            }
          }
        }
      ]
    },

    climate_heatwave: {
      id: "climate_heatwave",
      title: "☀️ Extreme Heat & 2026 Year of Climate Adaptation",
      subtitle: "Meteorological Extremes & Singapore's Environmental Resilience (1960–2025)",
      severity: "critical",
      severityLabel: "CLIMATE EMERGENCY (2026)",
      category: "recent",
      summary: "Global heat records tumbled consecutively in 2024-2026 with Singapore absolute peak temperatures touching 35.9°C. The government designated 2026 as the 'Year of Climate Adaptation', established the Heat Resilience Policy Office, and raised carbon taxes to $25/tonne.",
      datasetId: "climate_weather",
      chapters: [
        {
          chapterTitle: "1. Extreme Temperature Peaks Near 36°C",
          narrative: "Absolute extreme maximum temperatures climbed to 35.8°C in 2024 and 35.9°C in 2025, elevating urban heat island stress across high-density residential estates.",
          kpis: [
            { label: "Peak Temp (2025)", value: "35.9°C", badge: "danger" },
            { label: "Mean Daily Max (2024)", value: "32.1°C", badge: "warning" },
            { label: "1960s Decadal Mean", value: "30.9°C", badge: "safe" }
          ],
          preset: {
            chartType: "line",
            xField: "Year",
            yField: "Value",
            yAgg: "avg",
            colorField: "Weather_Metric",
            filters: {
              "Weather_Metric": ["Mean Daily Maximum Temp", "Absolute Extreme Max Temp"]
            }
          },
          annotations: {
            markLine: {
              symbol: ["none", "none"],
              lineStyle: { type: "dashed", color: "#f87171", width: 2 },
              data: [{ xAxis: "2025", label: { formatter: "2025: 35.9°C Record Heat", color: "#f87171" } }]
            }
          }
        },
        {
          chapterTitle: "2. Rainfall Volatility & Downpour Spikes",
          narrative: "Rainfall extremes intensified, with 2025 total annual rainfall reaching 2,833.5 mm and single-day downpours exceeding 210 mm, highlighting flash flood risks.",
          kpis: [
            { label: "Total Rainfall (2025)", value: "2,833.5 mm", badge: "highlight" },
            { label: "Peak Daily Rain", value: "210.5 mm", badge: "danger" },
            { label: "Rainy Days (2024)", value: "202 Days", badge: "warning" }
          ],
          preset: {
            chartType: "bar",
            xField: "Year",
            yField: "Value",
            yAgg: "sum",
            colorField: "Weather_Metric",
            filters: {
              "Weather_Metric": ["Total Annual Rainfall", "Peak Daily Rainfall"],
              "Year": ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]
            }
          }
        },
        {
          chapterTitle: "3. Multi-Decade Warming Trend (1960-2025)",
          narrative: "Decadal averages illustrate persistent baseline warming across Singapore, underpinning the nation's $100B coastal protection and district cooling commitments.",
          kpis: [
            { label: "1960s Mean Max", value: "31.2°C", badge: "safe" },
            { label: "2020s Mean Max", value: "32.0°C", badge: "danger" },
            { label: "Long-Term Shift", value: "+0.8°C Net Warming", badge: "warning" }
          ],
          preset: {
            chartType: "line",
            xField: "Decade",
            yField: "Value",
            yAgg: "avg",
            colorField: "Weather_Metric",
            filters: {
              "Weather_Metric": ["Mean Daily Maximum Temp", "Mean Daily Minimum Temp"]
            }
          }
        }
      ]
    },

    nodx_tech_war: {
      id: "nodx_tech_war",
      title: "🌐 Global Tech Trade & AI Semiconductor Surge (2018–2026)",
      subtitle: "Geoeconomic Fragmentation & Singapore's High-Tech Export Engine",
      severity: "strategic",
      severityLabel: "GLOBAL TRADE REALIGNMENT",
      category: "economy",
      summary: "Amid US-China tech restrictions, export curbs, and supply chain shifts ('China+1'), Singapore's trade engine experienced an AI-driven semiconductor resurgence with Integrated Circuits exports nearing $4B monthly in August 2026.",
      datasetId: "nodx_trade",
      chapters: [
        {
          chapterTitle: "1. Destination Market Realignment",
          narrative: "Bilateral export shifts show Mainland China, United States, and Taiwan commanding $2.5B–$3.3B monthly, reflecting realigned tech supply chains.",
          kpis: [
            { label: "US Monthly NODX (2026)", value: "$3,023M SGD", badge: "highlight" },
            { label: "Mainland China (2026)", value: "$3,253M SGD", badge: "highlight" },
            { label: "Taiwan NODX (2026)", value: "$1,846M SGD", badge: "safe" }
          ],
          preset: {
            chartType: "stacked_bar",
            xField: "Year",
            yField: "Export_Mil_SGD",
            yAgg: "sum",
            colorField: "Category",
            filters: {
              "Trade_Dimension": ["Destination Market"],
              "Category": ["United States", "Mainland China", "Taiwan", "European Union (EU)", "Malaysia"]
            }
          }
        },
        {
          chapterTitle: "2. The AI Semiconductor Boom (ICs)",
          narrative: "Integrated Circuits (semiconductors) surged to $3,916M monthly in August 2026, driven by global demand for AI server chips, memory, and advanced packaging.",
          kpis: [
            { label: "Integrated Circuits (Aug 2026)", value: "$3,916M SGD", badge: "danger" },
            { label: "Electronics Total (Aug 2026)", value: "$8,777M SGD", badge: "highlight" },
            { label: "Specialised Machinery", value: "$2,074M SGD", badge: "safe" }
          ],
          preset: {
            chartType: "line",
            xField: "Period",
            yField: "Export_Mil_SGD",
            yAgg: "sum",
            colorField: "Category",
            filters: {
              "Trade_Dimension": ["Product Division"],
              "Category": ["Integrated Circuits (Semiconductors)", "Personal Computers", "Specialised Machinery", "Pharmaceuticals"],
              "Year": ["2023", "2024", "2025", "2026"]
            }
          },
          annotations: {
            markLine: {
              symbol: ["none", "none"],
              lineStyle: { type: "dashed", color: "#38bdf8", width: 2 },
              data: [{ xAxis: "2026 Aug", label: { formatter: "2026 Aug: ICs Near $4B/mo", color: "#38bdf8" } }]
            }
          }
        },
        {
          chapterTitle: "3. High-Tech vs Non-Electronics Balance",
          narrative: "Electronics exports bounced back to represent nearly half of Singapore's merchandise domestic trade alongside pharmaceuticals and specialised machinery.",
          kpis: [
            { label: "Electronics (Aug 2026)", value: "$8.78B SGD", badge: "highlight" },
            { label: "Non-Electronics (Aug 2026)", value: "$10.64B SGD", badge: "safe" },
            { label: "Total NODX (Aug 2026)", value: "$19.41B SGD", badge: "warning" }
          ],
          preset: {
            chartType: "bar",
            xField: "Year",
            yField: "Export_Mil_SGD",
            yAgg: "sum",
            colorField: "Category",
            filters: {
              "Trade_Dimension": ["Product Division"],
              "Category": ["Electronics Total"]
            }
          }
        }
      ]
    },

    cpi_cycle: {
      id: "cpi_cycle",
      title: "🛒 Cost of Living & Sticky Inflation Cycles (1962–2024)",
      subtitle: "Multi-Decade Price Waves, 9% GST & Household Expenditure Burdens",
      severity: "warning",
      severityLabel: "COST OF LIVING & INFLATION",
      category: "recent",
      summary: "Tracking 60 years of inflation in Singapore, from the 1973 oil shocks to the 2022-2024 inflation spikes, post-9% GST pressures, and essential food and transport burdens.",
      datasetId: "cpi_inflation",
      chapters: [
        {
          chapterTitle: "1. 60-Year Historical Inflation Cycles",
          narrative: "Three major inflation waves stand out: 1973-1974 oil crisis (22%), 2008 Global Financial Crisis (6.6%), and the 2022-2023 surge (6.1%).",
          kpis: [
            { label: "1973 Oil Shock Peak", value: "22.4% (1974)", badge: "danger" },
            { label: "2008 GFC Peak", value: "6.6%", badge: "warning" },
            { label: "2022 Peak Inflation", value: "6.1%", badge: "danger" }
          ],
          preset: {
            chartType: "line",
            xField: "Year",
            yField: "Inflation_Rate_Pct",
            yAgg: "avg",
            colorField: "Basket",
            filters: {
              "Basket": ["All Items"]
              // No Year filter — show all available years dynamically
            }
          }
        },
        {
          chapterTitle: "2. Essentials Squeeze: Food, Housing & Transport",
          narrative: "Examining how food, utilities, and transport drove household cost-of-living anxiety during recent inflation waves.",
          kpis: [
            { label: "Food Inflation (2022)", value: "5.3%", badge: "warning" },
            { label: "Transport Peak", value: "16.4%", badge: "danger" },
            { label: "All Items (2023)", value: "4.8%", badge: "highlight" }
          ],
          preset: {
            chartType: "line",
            xField: "Year",
            yField: "Inflation_Rate_Pct",
            yAgg: "avg",
            colorField: "Basket",
            filters: {
              "Basket": ["All Items", "Food", "Housing & Utilities", "Transport"],
              "Year": ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]
            }
          }
        },
        {
          chapterTitle: "3. Decadal Inflation Averages",
          narrative: "Decadal averages illustrate how the 2020s marked a sharp return of persistent inflation after the disinflationary 2010s.",
          kpis: [
            { label: "2010s Average", value: "1.5%", badge: "safe" },
            { label: "2020s Average", value: "3.8%", badge: "warning" },
            { label: "Long-Term Mean", value: "2.5%", badge: "highlight" }
          ],
          preset: {
            chartType: "bar",
            xField: "Decade",
            yField: "Inflation_Rate_Pct",
            yAgg: "avg",
            colorField: "Basket",
            filters: {
              "Basket": ["All Items"]
            }
          }
        }
      ]
    },

    gdp_growth: {
      id: "gdp_growth",
      title: "🇸🇬 Singapore 60-Year Real GDP by Sector (1960–2024)",
      subtitle: "Economic Transformation from Entrepot Port to High-Tech Financial Hub",
      severity: "foundational",
      severityLabel: "ECONOMIC FOUNDATIONS",
      category: "economy",
      summary: "Visualizing six decades of real GDP growth in Singapore chained (2015) dollars across goods-producing and services-producing sectors.",
      datasetId: "gdp_industry",
      chapters: [
        {
          chapterTitle: "1. 21st-Century Sector Evolution",
          narrative: "Real GDP expansion from 2000 to 2024 across manufacturing, finance, wholesale trade, and professional services.",
          kpis: [
            { label: "1960 Real GDP", value: "$8.18B SGD", badge: "safe" },
            { label: "2024 Real GDP", value: "$540B+ SGD", badge: "highlight" },
            { label: "60-Year Real Growth", value: "66x Expansion", badge: "safe" }
          ],
          preset: {
            chartType: "stacked_bar",
            xField: "Year",
            yField: "GDP_Value",
            yAgg: "sum",
            colorField: "Sector",
            filters: {
              "Sector_Group": ["Goods Producing", "Services Producing"],
              "Year": Array.from({ length: 24 }, (_, i) => String(2000 + i))
            }
          }
        }
      ]
    },

    pop_pyramid: {
      id: "pop_pyramid",
      title: "👥 Population Age Pyramid & Gender Shift",
      subtitle: "Demographic Structure and Age Distribution of Singapore Residents",
      severity: "foundational",
      severityLabel: "DEMOGRAPHIC FOUNDATIONS",
      category: "society",
      summary: "Resident demographic distribution by age cohorts and gender, showing the bulge in middle-aged cohorts and narrowing base.",
      datasetId: "population_demographics",
      chapters: [
        {
          chapterTitle: "1. Latest Cohort Distribution",
          narrative: "Resident population breakdown by 5-year age cohorts comparing male and female residents.",
          kpis: [
            { label: "Total Population (2023)", value: "4.15M Residents", badge: "highlight" },
            { label: "Median Resident Age", value: "43.1 Years", badge: "warning" },
            { label: "Sex Ratio", value: "956 Males / 1000", badge: "safe" }
          ],
          preset: {
            chartType: "bar",
            xField: "Age_Group",
            yField: "Population",
            yAgg: "sum",
            colorField: "Sex",
            filters: {
              // No Year filter — defaults to all years; user can filter to latest via the Year control
              "Sex": ["Males", "Females"],
              "Ethnicity": ["All Ethnicities"]
            }
          }
        }
      ]
    },

    housing_planning: {
      id: "housing_planning",
      title: "🗺️ Planning Area Housing & Dwelling Types",
      subtitle: "Urban Geography & Housing Distribution Across 40 Planning Areas",
      severity: "foundational",
      severityLabel: "URBAN GEOGRAPHY",
      category: "economy",
      summary: "Census 2020 distribution of resident population across Bedok, Jurong West, Tampines, Woodlands, and other regional planning areas.",
      datasetId: "planning_area_housing",
      chapters: [
        {
          chapterTitle: "1. Planning Area Population by Region",
          narrative: "Total residents ranked by planning area, showing concentration in Eastern, Western, and Northern regional hubs.",
          kpis: [
            { label: "Top Planning Area", value: "Bedok (278k)", badge: "highlight" },
            { label: "Planning Areas Analyzed", value: "40 Towns", badge: "safe" },
            { label: "HDB Dwellers Share", value: "78.7%", badge: "safe" }
          ],
          preset: {
            chartType: "horizontal_bar",
            xField: "Residents",
            xAgg: "sum",
            yField: "Planning_Area",
            colorField: "Region",
            filters: {}
          }
        }
      ]
    }
  };

  // ==========================================================================
  // INTERACTIVE STORY CONTROLLER
  // ==========================================================================
  function loadStory(storyId, chapterIndex = 0) {
    const story = STORIES_REGISTRY[storyId];
    if (!story) return;

    state.activeStory = story;
    state.activeStoryChapterIndex = chapterIndex;
    DOM.presetSelect.value = storyId;

    // Switch dataset
    selectDataset(story.datasetId);

    // Render banner
    renderStoryBanner();

    // Apply chapter preset
    renderStoryChapter(chapterIndex);

    // Deferred resize: story banner just appeared, chart viewport shrank
    setTimeout(() => {
      if (state.echartsInstance) state.echartsInstance.resize();
    }, 50);
  }

  function renderStoryBanner() {
    if (!state.activeStory || !DOM.storyBanner) {
      if (DOM.storyBanner) DOM.storyBanner.style.display = "none";
      return;
    }

    const story = state.activeStory;
    DOM.storyBanner.style.display = "block";

    // Severity badge
    DOM.storySeverityBadge.className = `story-badge ${story.severity || "strategic"}`;
    DOM.storySeverityBadge.textContent = story.severityLabel || "FEATURED STORY";

    // Title
    DOM.storyBannerTitle.textContent = story.title;

    // Chapter pills
    DOM.storyChapterPills.innerHTML = "";
    story.chapters.forEach((ch, idx) => {
      const btn = document.createElement("button");
      btn.className = `chapter-pill ${idx === state.activeStoryChapterIndex ? "active" : ""}`;
      btn.textContent = ch.chapterTitle;
      btn.addEventListener("click", () => {
        setStoryChapter(idx);
      });
      DOM.storyChapterPills.appendChild(btn);
    });

    // Update prev/next button states
    DOM.storyPrevBtn.disabled = state.activeStoryChapterIndex === 0;
    DOM.storyNextBtn.disabled = state.activeStoryChapterIndex === story.chapters.length - 1;

    updateChapterBannerContent();
  }

  function updateChapterBannerContent() {
    if (!state.activeStory) return;
    const ch = state.activeStory.chapters[state.activeStoryChapterIndex];
    if (!ch) return;

    DOM.storyNarrativeText.textContent = ch.narrative || state.activeStory.summary;

    // Render KPI chips
    DOM.storyKpiChips.innerHTML = "";
    if (ch.kpis && ch.kpis.length > 0) {
      ch.kpis.forEach(k => {
        const chip = document.createElement("div");
        chip.className = `story-kpi-chip kpi-${k.badge || "highlight"}`;
        chip.innerHTML = `
          <span class="kpi-label">${escapeHtml(k.label)}</span>
          <span class="kpi-value">${escapeHtml(k.value)}</span>
        `;
        DOM.storyKpiChips.appendChild(chip);
      });
    }
  }

  function setStoryChapter(idx) {
    if (!state.activeStory) return;
    if (idx < 0 || idx >= state.activeStory.chapters.length) return;

    state.activeStoryChapterIndex = idx;

    // Update active pill
    DOM.storyChapterPills.querySelectorAll(".chapter-pill").forEach((pill, pIdx) => {
      pill.classList.toggle("active", pIdx === idx);
    });

    DOM.storyPrevBtn.disabled = idx === 0;
    DOM.storyNextBtn.disabled = idx === state.activeStory.chapters.length - 1;

    updateChapterBannerContent();
    renderStoryChapter(idx);
  }

  function renderStoryChapter(idx) {
    const ch = state.activeStory.chapters[idx];
    if (!ch) return;

    // Apply chapter preset
    applyPreset(ch.preset);
  }

  function nextStoryChapter() {
    if (!state.activeStory) return;
    if (state.activeStoryChapterIndex < state.activeStory.chapters.length - 1) {
      setStoryChapter(state.activeStoryChapterIndex + 1);
    }
  }

  function prevStoryChapter() {
    if (!state.activeStory) return;
    if (state.activeStoryChapterIndex > 0) {
      setStoryChapter(state.activeStoryChapterIndex - 1);
    }
  }

  function exitStoryMode() {
    state.activeStory = null;
    state.activeStoryChapterIndex = 0;
    if (DOM.storyBanner) DOM.storyBanner.style.display = "none";
    DOM.presetSelect.value = "";
    executeAndRender();
    // Double-deferred resize: banner hide changes layout, chart needs to fill reclaimed space
    setTimeout(() => {
      if (state.echartsInstance) state.echartsInstance.resize();
    }, 50);
  }

  // ==========================================================================
  // STORY HUB MODAL CONTROLLER
  // ==========================================================================
  function openStoryModal() {
    DOM.storyModal.classList.add("active");
    renderStoryModalCards(state.storyModalTab || "all");
  }

  function closeStoryModal() {
    DOM.storyModal.classList.remove("active");
  }

  function renderStoryModalCards(filterTab) {
    DOM.storyCardsGrid.innerHTML = "";
    const allStories = Object.values(STORIES_REGISTRY);

    const filtered = allStories.filter(s => {
      if (filterTab === "all") return true;
      if (filterTab === "recent") return s.category === "recent" || s.severity === "critical";
      if (filterTab === "society") return s.category === "society" || s.datasetId.includes("pop") || s.datasetId.includes("fert");
      if (filterTab === "economy") return s.category === "economy" || s.datasetId.includes("property") || s.datasetId.includes("trade") || s.datasetId.includes("gdp");
      return true;
    });

    filtered.forEach(s => {
      const card = document.createElement("div");
      card.className = "story-card";

      const kpisHtml = (s.chapters[0].kpis || []).map(k =>
        `<span class="story-card-metric-badge">${escapeHtml(k.label)}: <strong>${escapeHtml(k.value)}</strong></span>`
      ).join("");

      card.innerHTML = `
        <div class="story-card-header">
          <div class="story-card-top-row">
            <span class="story-badge ${s.severity || "strategic"}">${escapeHtml(s.severityLabel)}</span>
            <span style="font-size:11px; color:var(--text-muted);">${s.chapters.length} Chapters</span>
          </div>
          <div class="story-card-title">${escapeHtml(s.title)}</div>
          <div class="story-card-desc">${escapeHtml(s.summary)}</div>
          <div class="story-card-metrics">${kpisHtml}</div>
        </div>
        <div class="story-card-footer">
          <span class="story-card-dataset">📦 ${escapeHtml(s.datasetId)}</span>
          <button class="btn btn-primary btn-launch-story" style="font-size:11.5px; padding:5px 12px;">Explore Story ›</button>
        </div>
      `;

      card.querySelector(".btn-launch-story").addEventListener("click", () => {
        loadStory(s.id);
        closeStoryModal();
      });

      DOM.storyCardsGrid.appendChild(card);
    });
  }

  // Alias for backward compatibility
  function loadPresetStory(storyKey) {
    loadStory(storyKey);
  }

  function str(v) { return String(v); }
  function range(s, e) {
    const arr = [];
    for (let i = s; i < e; i++) arr.push(i);
    return arr;
  }

  // ==========================================================================
  // CATALOG SEARCH MODAL
  // ==========================================================================
  function renderCatalogResults(query) {
    const q = query.toLowerCase();
    DOM.catalogResultsList.innerHTML = "";

    const results = state.catalog
      .filter(item => !q || item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))
      .slice(0, 100);

    if (results.length === 0) {
      DOM.catalogResultsList.innerHTML = `<div style="padding:16px; color:var(--text-muted);">No matching datasets found.</div>`;
      return;
    }

    results.forEach(item => {
      const card = document.createElement("div");
      card.className = "catalog-item-card";
      card.innerHTML = `
        <div>
          <div class="catalog-item-title">${escapeHtml(item.title)}</div>
          <div class="catalog-item-meta">ID: <strong>${item.id}</strong> • ${item.theme} • ${item.subject} • ${item.tableType}</div>
        </div>
        <button class="btn btn-primary btn-load-catalog" style="font-size:11px;">Load CSV</button>
      `;

      card.querySelector(".btn-load-catalog").addEventListener("click", () => {
        loadCatalogCSV(item.id, item.title);
        DOM.catalogModal.classList.remove("active");
      });

      DOM.catalogResultsList.appendChild(card);
    });
  }

  function loadCatalogCSV(tableId, title) {
    const path = `singstat_data/csv/SingStat Table Builder/${tableId}.csv`;
    fetch(path)
      .then(r => {
        if (!r.ok) throw new Error("CSV file not found locally.");
        return r.text();
      })
      .then(csvText => {
        parseAndLoadCSV(csvText, tableId, title);
      })
      .catch(err => {
        alert(`Could not load ${tableId}.csv via HTTP: ${err.message}. You can use 'Load File' to upload it directly.`);
      });
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const tid = file.name.replace(/\.[^/.]+$/, "");
      parseAndLoadCSV(text, tid, file.name);
    };
    reader.readAsText(file);
  }

  function parseAndLoadCSV(csvText, id, title) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      alert("Invalid CSV format.");
      return;
    }

    // Skip title comment row if present
    let startIdx = 0;
    if (lines[0].startsWith("# Title:")) startIdx = 1;

    const header = parseCSVLine(lines[startIdx]);
    if (!header || header.length < 2) return;

    // Detect if this is standard SingStat Table [Series No, Row Description, UoM, Footnotes, TimeCols...]
    const isStandardSingstat = header[0] === "Series No" && header[1] === "Row Description";

    const customData = [];
    const fields = [];

    if (isStandardSingstat) {
      // Unpivot time columns into clean long format
      const timeCols = header.slice(4);
      fields.push({ name: "Series_Description", type: "dimension", role: "category" });
      fields.push({ name: "Unit_Of_Measure", type: "dimension", role: "uom" });
      fields.push({ name: "Period", type: "dimension", role: "time" });
      fields.push({ name: "Value", type: "measure", defaultAgg: "sum", format: "number" });

      for (let i = startIdx + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (!row || row.length < 5) continue;
        const desc = row[1];
        const uom = row[2];
        timeCols.forEach((p, pIdx) => {
          const rawVal = row[4 + pIdx];
          if (rawVal && rawVal !== "na" && rawVal !== "-") {
            const num = parseFloat(rawVal.replace(/,/g, ""));
            if (!isNaN(num)) {
              customData.push({
                "Series_Description": desc,
                "Unit_Of_Measure": uom,
                "Period": p,
                "Value": num
              });
            }
          }
        });
      }
    } else {
      // Generic tabular CSV
      header.forEach(col => {
        fields.push({ name: col, type: "dimension" });
      });

      for (let i = startIdx + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (!row || row.length !== header.length) continue;
        const rec = {};
        header.forEach((h, idx) => {
          rec[h] = row[idx];
        });
        customData.push(rec);
      }
    }

    const newDataset = {
      id: "custom_" + id,
      title: title,
      theme: "Custom",
      subject: "User Uploaded",
      fields: fields,
      data: customData,
      defaultPreset: {
        chartType: "bar",
        xField: fields[0].name,
        yField: fields[fields.length - 1].name
      }
    };

    state.datasets.unshift(newDataset);
    populateDatasetSelect();
    selectDataset(newDataset.id);
    alert(`Successfully loaded '${title}' with ${customData.length.toLocaleString()} records!`);
  }

  function parseCSVLine(line) {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        let field = line.substring(start, i).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
          field = field.substring(1, field.length - 1).replace(/""/g, '"');
        }
        result.push(field);
        start = i + 1;
      }
    }
    let lastField = line.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
      lastField = lastField.substring(1, lastField.length - 1).replace(/""/g, '"');
    }
    result.push(lastField);
    return result;
  }

  function exportCurrentDataToCSV() {
    if (!state.activeDataset) return;
    const colField = state.shelves.columns[0] ? state.shelves.columns[0].name : "Column";
    const rowField = state.shelves.rows[0] ? state.shelves.rows[0].name : "Row";
    const colorField = state.shelves.color[0] ? state.shelves.color[0].name : null;
    const measures = state.shelves.measures.length > 0
      ? state.shelves.measures
      : [{ name: "Count", agg: "count" }];

    const headers = [colField, rowField];
    if (colorField) headers.push(colorField);
    measures.forEach(m => headers.push(`${m.agg.toUpperCase()}_${m.name}`));

    let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    // Filter data
    let filteredData = state.activeDataset.data;
    const filterEntries = Object.entries(state.shelves.filters);
    if (filterEntries.length > 0) {
      filteredData = filteredData.filter(row => {
        for (const [fName, allowedSet] of filterEntries) {
          const val = row[fName] !== undefined ? String(row[fName]) : "(Blank)";
          if (!allowedSet.has(val)) return false;
        }
        return true;
      });
    }

    // Grouping
    const groupMap = new Map();
    filteredData.forEach(row => {
      const colVal = colField && state.shelves.columns[0] ? String(row[colField] ?? "All") : "All";
      const rowVal = rowField && state.shelves.rows[0] ? String(row[rowField] ?? "All") : "All";
      const colorVal = colorField ? String(row[colorField] ?? "All") : "All";
      const key = `${colVal}|||${rowVal}|||${colorVal}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, { col: colVal, row: rowVal, color: colorVal, values: measures.map(() => []) });
      }
      const grp = groupMap.get(key);
      measures.forEach((m, idx) => {
        if (m.agg === "count") {
          grp.values[idx].push(1);
        } else {
          const v = parseFloat(row[m.name]);
          if (!isNaN(v)) grp.values[idx].push(v);
        }
      });
    });

    groupMap.forEach(grp => {
      const rowCells = [grp.col, grp.row];
      if (colorField) rowCells.push(grp.color);
      measures.forEach((m, idx) => {
        const arr = grp.values[idx];
        let aggVal = 0;
        if (arr.length > 0) {
          if (m.agg === "sum" || m.agg === "count") aggVal = arr.reduce((a, b) => a + b, 0);
          else if (m.agg === "avg") aggVal = arr.reduce((a, b) => a + b, 0) / arr.length;
          else if (m.agg === "min") aggVal = Math.min(...arr);
          else if (m.agg === "max") aggVal = Math.max(...arr);
        }
        rowCells.push(round(aggVal, 2));
      });
      csvContent += rowCells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SingStat_${state.activeDatasetId}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // FORMATTING & HELPERS
  // ==========================================================================
  function formatNumber(val, format) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (format === "currency_m") return `$${round(val, 1).toLocaleString()} M`;
    if (format === "currency") return `$${round(val, 0).toLocaleString()}`;
    if (format === "percent") return `${round(val, 2)}%`;
    if (format === "integer") return Math.round(val).toLocaleString();
    return round(val, 2).toLocaleString();
  }

  function formatShortNumber(val, format) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    const abs = Math.abs(val);
    if (format === "currency_m") {
      if (abs >= 1000) return `$${round(val / 1000, 1)}B`;
      return `$${round(val, 0)}M`;
    }
    if (format === "percent") return `${round(val, 1)}%`;
    if (abs >= 1e9) return `$${round(val / 1e9, 1)}B`;
    if (abs >= 1e6) return `${round(val / 1e6, 1)}M`;
    if (abs >= 1e3) return `${round(val / 1e3, 1)}k`;
    return round(val, 1);
  }

  function round(val, dec) {
    const m = Math.pow(10, dec || 0);
    return Math.round(val * m) / m;
  }

  function formatVizTitle(type) {
    const titles = {
      stacked_bar: "Stacked Bar Chart",
      bar: "Vertical Bar Chart",
      horizontal_bar: "Horizontal Bar Chart",
      line: "Line Trend Chart",
      area: "Stacked Area Chart",
      pie: "Donut / Pie Chart",
      scatter: "Scatter Plot",
      treemap: "Hierarchical Treemap",
      pivot: "Pivot Matrix Table",
      kpi: "KPI Scorecards"
    };
    return titles[type] || type;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Start app when DOM is ready
  document.addEventListener("DOMContentLoaded", init);
})();
