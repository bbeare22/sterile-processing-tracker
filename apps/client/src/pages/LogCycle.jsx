import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";
import { useToast } from "../components/Toast/ToastProvider";
import { formatLocalInputDateTime, localInputToISO } from "../utils/date";
import "./logcycle.css";

export default function LogCycle() {
  const { show } = useToast();

  // machines
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    machineId: "",
    startedAt: formatLocalInputDateTime(new Date()),
    completedAt: "",
    loadNumber: "",
    result: "pass",
    clinicName: "",
    loadStaff: "",
    unloadStaff: "",
    sterileDryMinutes: "",
    maxTempPressure: "",
    items: "",
    notes: "",
    sporeRan: false,
    spore: {
      well: "",
      lot: "",
      expireDate: "",
      incubatedAt: "",
      result: "negative",
      verifiedAt: "",
      verifiedBy: "",
    },
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpore = (k, v) =>
    setForm((f) => ({ ...f, spore: { ...f.spore, [k]: v } }));

  // load sterilizers
  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        setErr("");
        setLoadingMachines(true);
        const r = await apiFetch("/api/machines?type=sterilizer&status=active");
        if (!r.ok) throw new Error(`Machines HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setMachines(j.machines || []);
      } catch (e) {
        if (!cancel) setErr(e.message || "Failed to load machines");
      } finally {
        if (!cancel) setLoadingMachines(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, []);

  const sterilizers = useMemo(
    () => (machines || []).filter((m) => m.type === "sterilizer"),
    [machines]
  );

  // helpers
  function toISOOrUndefinedFromLocal(localStr) {
    if (!localStr) return undefined;
    const iso = localInputToISO(localStr);
    return iso || undefined;
  }

  function stripEmpty(obj) {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === "" || v === null || v === undefined) continue;
      if (typeof v === "object" && !Array.isArray(v)) {
        const nested = stripEmpty(v);
        if (Object.keys(nested).length) out[k] = nested;
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function buildPayload() {
    const base = {
      machineId: form.machineId || undefined,
      machineType: "sterilizer",
      startedAt: toISOOrUndefinedFromLocal(form.startedAt),
      completedAt: toISOOrUndefinedFromLocal(form.completedAt),
      loadNumber: form.loadNumber,
      result: form.result,
      items: form.items,
      notes: form.notes,
      clinicName: form.clinicName,
      loadStaff: form.loadStaff,
      unloadStaff: form.unloadStaff,
      maxTempPressure: form.maxTempPressure,
    };

    if (form.sterileDryMinutes !== "") {
      const n = Number(form.sterileDryMinutes);
      if (!isNaN(n)) base.sterileDryMinutes = n;
    }

    if (form.sporeRan) {
      const spore = {
        ran: true,
        well: form.spore.well,
        lot: form.spore.lot,
        expireDate: form.spore.expireDate
          ? new Date(form.spore.expireDate).toISOString()
          : undefined,
        incubatedAt: toISOOrUndefinedFromLocal(form.spore.incubatedAt),
        result: form.spore.result,
        verifiedAt: toISOOrUndefinedFromLocal(form.spore.verifiedAt),
        verifiedBy: form.spore.verifiedBy,
      };
      base.spore = stripEmpty(spore);
      if (!Object.keys(base.spore).length) base.spore = { ran: true };
    }

    return stripEmpty(base);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      const payload = buildPayload();
      if (!payload.machineId) throw new Error("Please select a sterilizer.");
      if (!payload.startedAt) throw new Error("Start time is required.");

      const r = await apiFetch("/api/cycles", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const bodyText = await r.text();
        let msg = bodyText?.trim();
        try {
          const j = JSON.parse(bodyText);
          msg = j.error || j.message || bodyText;
        } catch {}
        throw new Error(msg || `HTTP ${r.status}`);
      }

      show("Cycle saved ✔", { tone: "ok" });

      // soft reset (keep selected machine)
      setForm((f) => ({
        ...f,
        startedAt: formatLocalInputDateTime(new Date()),
        completedAt: "",
        loadNumber: "",
        result: "pass",
        clinicName: "",
        loadStaff: "",
        unloadStaff: "",
        sterileDryMinutes: "",
        maxTempPressure: "",
        items: "",
        notes: "",
        sporeRan: false,
        spore: {
          well: "",
          lot: "",
          expireDate: "",
          incubatedAt: "",
          result: "negative",
          verifiedAt: "",
          verifiedBy: "",
        },
      }));
    } catch (e) {
      const msg = e.message || "Failed to save cycle";
      setErr(msg);
      show(msg, { tone: "danger", ms: 8000 });
    }
  }

  function onReset() {
    setForm((f) => ({
      ...f,
      completedAt: "",
      loadNumber: "",
      result: "pass",
      clinicName: "",
      loadStaff: "",
      unloadStaff: "",
      sterileDryMinutes: "",
      maxTempPressure: "",
      items: "",
      notes: "",
      sporeRan: false,
      spore: {
        well: "",
        lot: "",
        expireDate: "",
        incubatedAt: "",
        result: "negative",
        verifiedAt: "",
        verifiedBy: "",
      },
    }));
  }

  return (
    <div>
      <h1 className="logcycle__title">Log Sterilizer Cycle</h1>

      {err && (
        <div className="logcycle__error" role="alert">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="logcycle__card">
        {/* Machine */}
        <div className="logcycle__field">
          <label className="logcycle__label">Machine</label>
          <select
            value={form.machineId}
            onChange={(e) => setField("machineId", e.target.value)}
            className="logcycle__input"
            disabled={loadingMachines}
            required
          >
            <option value="">
              {loadingMachines ? "Loading…" : "Select a sterilizer"}
            </option>
            {sterilizers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* times */}
        <div className="logcycle__row2">
          <div className="logcycle__field">
            <label className="logcycle__label">Started At</label>
            <input
              type="datetime-local"
              value={form.startedAt}
              onChange={(e) => setField("startedAt", e.target.value)}
              className="logcycle__input"
              required
            />
          </div>
          <div className="logcycle__field">
            <label className="logcycle__label">Completed At</label>
            <input
              type="datetime-local"
              value={form.completedAt}
              onChange={(e) => setField("completedAt", e.target.value)}
              className="logcycle__input"
            />
          </div>
        </div>

        {/* load + result */}
        <div className="logcycle__row2">
          <div className="logcycle__field">
            <label className="logcycle__label">Load #</label>
            <input
              placeholder="e.g., 01"
              value={form.loadNumber}
              onChange={(e) => setField("loadNumber", e.target.value)}
              className="logcycle__input"
            />
          </div>
          <div className="logcycle__field">
            <label className="logcycle__label">Result</label>
            <select
              value={form.result}
              onChange={(e) => setField("result", e.target.value)}
              className="logcycle__input"
            >
              <option value="pass">pass</option>
              <option value="fail">fail</option>
            </select>
          </div>
        </div>

        {/* clinic + staff */}
        <div className="logcycle__field">
          <label className="logcycle__label">
            Clinic / Department (optional)
          </label>
          <input
            placeholder="e.g., Jet Wing"
            value={form.clinicName}
            onChange={(e) => setField("clinicName", e.target.value)}
            className="logcycle__input"
          />
        </div>

        <div className="logcycle__row2">
          <div className="logcycle__field">
            <label className="logcycle__label">Load Staff</label>
            <input
              placeholder="e.g., BB"
              value={form.loadStaff}
              onChange={(e) => setField("loadStaff", e.target.value)}
              className="logcycle__input"
            />
          </div>
          <div className="logcycle__field">
            <label className="logcycle__label">Unload Staff</label>
            <input
              placeholder="e.g., BB"
              value={form.unloadStaff}
              onChange={(e) => setField("unloadStaff", e.target.value)}
              className="logcycle__input"
            />
          </div>
        </div>

        {/* timing + gauge */}
        <div className="logcycle__row2">
          <div className="logcycle__field">
            <label className="logcycle__label">
              Sterile & Dry Time (minutes)
            </label>
            <input
              inputMode="numeric"
              placeholder="e.g., 7m 35m"
              value={form.sterileDryMinutes}
              onChange={(e) => setField("sterileDryMinutes", e.target.value)}
              className="logcycle__input"
            />
          </div>
          <div className="logcycle__field">
            <label className="logcycle__label">Max Temp/Pressure</label>
            <input
              placeholder="e.g., 270°F / 27 psi"
              value={form.maxTempPressure}
              onChange={(e) => setField("maxTempPressure", e.target.value)}
              className="logcycle__input"
            />
          </div>
        </div>

        {/* items */}
        <div className="logcycle__field">
          <label className="logcycle__label">
            Items (what’s inside the load)
          </label>
          <textarea
            rows={3}
            placeholder="e.g., ×15 Pouches, ×6 OS, ×8 Restorative, ×12 XCP, ×15 basic"
            value={form.items}
            onChange={(e) => setField("items", e.target.value)}
            className="logcycle__input"
          />
        </div>

        {/* spore toggle */}
        <label className="logcycle__checkrow">
          <input
            type="checkbox"
            checked={form.sporeRan}
            onChange={(e) => setField("sporeRan", e.target.checked)}
          />
          Spore Test Ran
        </label>

        {/* spore fields */}
        {form.sporeRan && (
          <div className="logcycle__sporeSection">
            <div className="logcycle__row2">
              <div className="logcycle__field">
                <label className="logcycle__label">Placed in Well #</label>
                <input
                  placeholder="e.g., 2"
                  value={form.spore.well}
                  onChange={(e) => setSpore("well", e.target.value)}
                  className="logcycle__input"
                />
              </div>
              <div className="logcycle__field">
                <label className="logcycle__label">Spore Lot #</label>
                <input
                  placeholder="e.g., 20261018"
                  value={form.spore.lot}
                  onChange={(e) => setSpore("lot", e.target.value)}
                  className="logcycle__input"
                />
              </div>
            </div>

            <div className="logcycle__row2">
              <div className="logcycle__field">
                <label className="logcycle__label">Spore Expire Date</label>
                <input
                  type="date"
                  value={form.spore.expireDate}
                  onChange={(e) => setSpore("expireDate", e.target.value)}
                  className="logcycle__input"
                />
              </div>
              <div className="logcycle__field">
                <label className="logcycle__label">
                  Incubation Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.spore.incubatedAt}
                  onChange={(e) => setSpore("incubatedAt", e.target.value)}
                  className="logcycle__input"
                />
              </div>
            </div>

            <div className="logcycle__row2">
              <div className="logcycle__field">
                <label className="logcycle__label">Spore Result</label>
                <select
                  value={form.spore.result}
                  onChange={(e) => setSpore("result", e.target.value)}
                  className="logcycle__input"
                >
                  <option value="negative">Negative</option>
                  <option value="positive">Positive</option>
                </select>
              </div>
              <div className="logcycle__field">
                <label className="logcycle__label">Readout Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.spore.verifiedAt}
                  onChange={(e) => setSpore("verifiedAt", e.target.value)}
                  className="logcycle__input"
                />
              </div>
            </div>

            <div className="logcycle__field">
              <label className="logcycle__label">
                Readout Verify Staff’s Printed Name
              </label>
              <input
                placeholder="e.g., WM"
                value={form.spore.verifiedBy}
                onChange={(e) => setSpore("verifiedBy", e.target.value)}
                className="logcycle__input"
              />
            </div>
          </div>
        )}

        {/* notes + actions */}
        <div className="logcycle__field">
          <label className="logcycle__label">Notes (optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className="logcycle__input"
          />
        </div>

        <div className="logcycle__actions">
          <button type="submit" className="logcycle__btnPrimary">
            Save
          </button>
          <button
            type="button"
            onClick={onReset}
            className="logcycle__btnGhost"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
