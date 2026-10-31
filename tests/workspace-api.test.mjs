// Run against a local dev server: npm run test:workspace
// Creates uniquely named demo records and removes them in finally. Never point at production.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  throw new Error("Workspace integration tests are restricted to a local server.");
}
const ownerEmail = process.env.TEST_ADMIN_EMAIL ?? "admin@glowsalon.pk";
const ownerPassword = process.env.TEST_ADMIN_PASSWORD ?? "GlowAdmin@2026";
const suffix = randomUUID();
const ids = { a: `test-a-${suffix}`, b: `test-b-${suffix}`, a1: `branch-a1-${suffix}`, a2: `branch-a2-${suffix}`, b1: `branch-b1-${suffix}` };
const managerEmail = `manager-${suffix}@salon.example`;
const receptionEmail = `reception-${suffix}@salon.example`;
const password = "TestAccess123!";

async function request(path, { cookie, method = "GET", body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  let data = {};
  try { data = await response.json(); } catch { /* no body */ }
  return { status: response.status, data, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function login(email, pass) {
  const result = await request("/api/auth/login", { method: "POST", body: { email, password: pass } });
  assert.equal(result.status, 200, `login failed: ${result.data.error ?? "unknown"}`);
  assert(result.cookie);
  return result.cookie;
}
function profile(id, branches) {
  return {
    id, profileVersion: 0, ownerName: "Test owner", email: "", whatsapp: "", images: [],
    settings: {
      id, name: `Test salon ${id}`, city: "Lahore", area: "", address: "", phone: "",
      openingTime: "11:00 AM", closingTime: "09:00 PM", offDays: [], greetingMessage: "", repeatGreetingTemplate: "", googleReviewUrl: "",
      branches, activeBranchId: branches[0].id,
      stylists: [{ id: `staff-${id}`, name: "Test stylist", specialty: "Hair", availableDays: [], branchId: branches[0].id }],
      services: [{ id: `service-${id}`, name: "Test cut", category: "Hair", pricePKR: 2500, durationMinutes: 45, description: "" }],
    },
  };
}
function booking(id, salonId, branchId, time) {
  return { id, salonId, branchId, customerName: "Test guest", customerPhone: "", serviceName: "Test cut", stylistName: "Test stylist", date: "2027-05-10", time, status: "confirmed", amountPKR: 2500, channel: "direct", createdAt: new Date().toISOString(), isRecovered: false };
}

test("workspace CRUD, scoped staff roles, concurrent slots and revocation", async () => {
  let owner, managerId, receptionId;
  const createdSalons = [];
  try {
    assert.equal((await request("/api/workspaces")).status, 401);
    owner = await login(ownerEmail, ownerPassword);
    const a = profile(ids.a, [{ id: ids.a1, name: "DHA", area: "Lahore" }, { id: ids.a2, name: "Gulberg", area: "Lahore" }]);
    const b = profile(ids.b, [{ id: ids.b1, name: "Main", area: "Lahore" }]);
    for (const record of [a, b]) {
      const result = await request("/api/workspaces", { cookie: owner, method: "POST", body: { profile: record } });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      assert.deepEqual(result.data.workspace.bookings, []);
      record.profileVersion = result.data.workspace.profileVersion;
      createdSalons.push(record.id);
    }
    const invalid = structuredClone(a); invalid.settings.stylists[0].photoDataUrl = "data:image/svg+xml;base64,PHN2Zz4=";
    assert.equal((await request(`/api/workspaces/${ids.a}`, { cookie: owner, method: "PUT", body: { profile: invalid } })).status, 400);
    assert.equal((await request("/api/team", { cookie: owner, method: "POST", body: { email: `unassigned-${suffix}@salon.example`, displayName: "No salon", password, role: "manager" } })).status, 400);

    for (const [email, role] of [[managerEmail, "manager"], [receptionEmail, "reception"]]) {
      const result = await request("/api/team", { cookie: owner, method: "POST", body: { email, displayName: `Test ${role}`, password, role, salonId: ids.a, branchId: ids.a1 } });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      if (role === "manager") managerId = result.data.account.id; else receptionId = result.data.account.id;
    }
    const manager = await login(managerEmail, password);
    const reception = await login(receptionEmail, password);
    const managerList = await request("/api/workspaces", { cookie: manager });
    assert.deepEqual(managerList.data.workspaces.map((item) => item.id), [ids.a]);
    assert.equal((await request(`/api/workspaces/${ids.b}`, { cookie: manager })).status, 403);
    assert.equal((await request("/api/team", { cookie: manager })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.a}`, { cookie: manager, method: "PUT", body: { profile: a } })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.b}/actions`, { cookie: reception, method: "POST", body: { action: { type: "booking.add", booking: booking("forbidden", ids.b, ids.b1, "03:00 PM") } } })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: manager, method: "POST", body: { action: { type: "booking.add", booking: booking(`wrong-branch-${suffix}`, ids.a, ids.a2, "02:00 PM") } } })).status, 403);

    // Day-to-day roles can close/reopen their assigned branch only.
    const roleBlock = { id: `role-block-${suffix}`, scope: "branch", branchId: ids.a1, startDate: "2027-05-11", endDate: "2027-05-11", allDay: true, reason: "Holiday", createdAt: new Date().toISOString() };
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { method: "POST", body: { action: { type: "schedule.block.add", block: roleBlock } } })).status, 401);
    assert.equal((await request(`/api/workspaces/${ids.b}/actions`, { cookie: reception, method: "POST", body: { action: { type: "schedule.block.add", block: roleBlock } } })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: manager, method: "POST", body: { action: { type: "schedule.block.add", block: roleBlock } } })).status, 200);
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: reception, method: "POST", body: { action: { type: "schedule.block.delete", id: roleBlock.id } } })).status, 200);

    // Two staff attempt the same chair/hour concurrently: one wins, one conflicts.
    const actions = await Promise.all([manager, reception].map((cookie, i) => request(`/api/workspaces/${ids.a}/actions`, { cookie, method: "POST", body: { action: { type: "booking.add", booking: booking(`booking-${i}-${suffix}`, ids.a, ids.a1, "03:30 PM") } } })));
    assert.deepEqual(actions.map((result) => result.status).sort(), [200, 409]);
    const current = await request(`/api/workspaces/${ids.a}`, { cookie: owner });
    const bookingId = current.data.workspace.bookings[0].id;
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: reception, method: "POST", body: { action: { type: "booking.edit", id: bookingId, patch: { customerName: "Not allowed" } } } })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: manager, method: "POST", body: { action: { type: "booking.delete", id: bookingId } } })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: reception, method: "POST", body: { action: { type: "booking.status", id: bookingId, status: "completed" } } })).status, 200);
    assert.equal((await request(`/api/workspaces/${ids.a}/actions`, { cookie: manager, method: "POST", body: { action: { type: "booking.edit", id: bookingId, patch: { salonId: ids.b } } } })).status, 400);

    // Profile updates preserve booking data, and branch renames follow stable IDs.
    a.settings.branches[0].name = "DHA renamed";
    a.settings.stylists[0].name = "Renamed stylist";
    a.settings.services[0].name = "Renamed cut";
    const updated = await request(`/api/workspaces/${ids.a}`, { cookie: owner, method: "PUT", body: { profile: a } });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.workspace.bookings[0].branchName, "DHA renamed");
    assert.equal(updated.data.workspace.bookings[0].stylistName, "Renamed stylist");
    assert.equal(updated.data.workspace.bookings[0].serviceName, "Renamed cut");
    assert.equal(updated.data.workspace.bookings[0].status, "completed");
    // A stale profile cannot overwrite changes (or delete a newly added branch).
    assert.equal((await request(`/api/workspaces/${ids.a}`, { cookie: owner, method: "PUT", body: { profile: a } })).status, 409);
    a.profileVersion = updated.data.workspace.profileVersion;
    // Explicit branch deletion removes only that branch's records.
    a.settings.branches = a.settings.branches.filter((branch) => branch.id === ids.a2);
    a.settings.stylists[0].branchId = ids.a2;
    const branchRemoved = await request(`/api/workspaces/${ids.a}`, { cookie: owner, method: "PUT", body: { profile: a } });
    assert.equal(branchRemoved.status, 200);
    assert.equal(branchRemoved.data.workspace.bookings.length, 0);

    // Reassignment and deactivation take effect for an existing cookie immediately.
    assert.equal((await request(`/api/team/${managerId}`, { cookie: owner, method: "PATCH", body: { salonId: ids.b, branchId: ids.b1 } })).status, 200);
    assert.equal((await request(`/api/workspaces/${ids.a}`, { cookie: manager })).status, 403);
    assert.equal((await request(`/api/workspaces/${ids.b}`, { cookie: manager })).status, 200);
    assert.equal((await request(`/api/team/${managerId}`, { cookie: owner, method: "PATCH", body: { isActive: false } })).status, 200);
    assert.equal((await request("/api/workspaces", { cookie: manager })).status, 403);
    assert.equal((await request(`/api/team/${receptionId}`, { cookie: owner, method: "DELETE" })).status, 200);
    receptionId = undefined;
    assert.equal((await request("/api/workspaces", { cookie: reception })).status, 403);
  } finally {
    if (owner) {
      for (const id of [managerId, receptionId].filter(Boolean)) await request(`/api/team/${id}`, { cookie: owner, method: "DELETE" });
      for (const id of createdSalons) await request(`/api/workspaces/${id}`, { cookie: owner, method: "DELETE" });
    }
  }
});

test("chair availability uses service duration, staff identity and all branches", async () => {
  let owner;
  const id = `slot-test-${randomUUID()}`;
  const branchA = `a-${suffix}`, branchB = `b-${suffix}`;
  const firstStaff = `first-${suffix}`, secondStaff = `second-${suffix}`;
  const longService = `long-${suffix}`, shortService = `short-${suffix}`;
  let created = false;
  try {
    owner = await login(ownerEmail, ownerPassword);
    const record = profile(id, [{ id: branchA, name: "A", area: "Lahore" }, { id: branchB, name: "B", area: "Lahore" }]);
    record.settings.stylists = [
      { id: firstStaff, name: "Shared stylist", specialty: "Hair", availableDays: [] },
      { id: secondStaff, name: "Shared stylist", specialty: "Hair", availableDays: [], branchId: branchB },
    ];
    record.settings.services = [
      { id: longService, name: "Long service", category: "Hair", pricePKR: 5000, durationMinutes: 120, description: "" },
      { id: shortService, name: "Short service", category: "Hair", pricePKR: 2000, durationMinutes: 45, description: "" },
    ];
    const result = await request("/api/workspaces", { cookie: owner, method: "POST", body: { profile: record } });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    created = true;
    record.profileVersion = result.data.workspace.profileVersion;
    const make = (bookingId, branchId, stylistId, serviceId, date, time) => ({
      ...booking(bookingId, id, branchId, time), date, stylistId, stylistName: "Shared stylist",
      serviceId, serviceName: serviceId === longService ? "Long service" : "Short service",
      // The server must ignore a malicious attempt to shorten the duration.
      durationMinutes: 1,
    });
    const add = (item) => request(`/api/workspaces/${id}/actions`, { cookie: owner, method: "POST", body: { action: { type: "booking.add", booking: item } } });
    const first = await add(make(`long-booking-${suffix}`, branchA, firstStaff, longService, "2027-05-10", "11:30 AM"));
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.workspace.bookings[0].durationMinutes, 120);
    assert.equal((await add(make(`overlap-${suffix}`, branchA, firstStaff, shortService, "2027-05-10", "12:00 PM"))).status, 409);
    assert.equal((await add(make(`cross-branch-${suffix}`, branchB, firstStaff, shortService, "2027-05-10", "01:00 PM"))).status, 409);
    assert.equal((await add(make(`adjacent-${suffix}`, branchB, firstStaff, shortService, "2027-05-10", "01:30 PM"))).status, 200);
    // Two different people can share a display name without blocking each other.
    assert.equal((await add(make(`same-name-${suffix}`, branchB, secondStaff, shortService, "2027-05-10", "12:00 PM"))).status, 200);
    assert.equal((await add(make(`invalid-time-${suffix}`, branchB, secondStaff, shortService, "2027-05-10", "99:99 PM"))).status, 400);
    assert.equal((await add(make(`invalid-date-${suffix}`, branchB, secondStaff, shortService, "2027-02-30", "10:00 AM"))).status, 400);
    // Subsequent changes to the menu must not shorten an existing appointment.
    record.settings.services[0].durationMinutes = 15;
    const updated = await request(`/api/workspaces/${id}`, { cookie: owner, method: "PUT", body: { profile: record } });
    assert.equal(updated.status, 200);
    assert.equal((await add(make(`historic-overlap-${suffix}`, branchA, firstStaff, shortService, "2027-05-10", "12:45 PM"))).status, 409);
    const cancelled = await request(`/api/workspaces/${id}/actions`, { cookie: owner, method: "POST", body: { action: { type: "booking.status", id: `long-booking-${suffix}`, status: "cancelled" } } });
    assert.equal(cancelled.status, 200);
    assert.equal((await add(make(`after-cancel-${suffix}`, branchA, firstStaff, shortService, "2027-05-10", "12:45 PM"))).status, 200);
    // Intervals can span midnight, even though the timeline offers same-day starts.
    record.profileVersion = updated.data.workspace.profileVersion;
    record.settings.services[0].durationMinutes = 120;
    assert.equal((await request(`/api/workspaces/${id}`, { cookie: owner, method: "PUT", body: { profile: record } })).status, 200);
    assert.equal((await add(make(`night-${suffix}`, branchA, firstStaff, longService, "2027-05-12", "11:30 PM"))).status, 200);
    assert.equal((await add(make(`night-overlap-${suffix}`, branchB, firstStaff, shortService, "2027-05-13", "12:30 AM"))).status, 409);
    assert.equal((await add(make(`night-after-${suffix}`, branchB, firstStaff, shortService, "2027-05-13", "01:30 AM"))).status, 200);
  } finally {
    if (owner && created) await request(`/api/workspaces/${id}`, { cookie: owner, method: "DELETE" });
  }
});


test("holidays, timed closures and weekly off are enforced atomically with unique booking references", async () => {
  let owner;
  let created = false;
  const id = `closure-test-${randomUUID()}`;
  const a = `a-${suffix}`, b = `b-${suffix}`, shared = `shared-${suffix}`, other = `other-${suffix}`;
  const short = `short-${suffix}`, long = `long-${suffix}`;
  try {
    owner = await login(ownerEmail, ownerPassword);
    const record = profile(id, [{ id: a, name: "A", area: "Lahore" }, { id: b, name: "B", area: "Lahore" }]);
    record.settings.offDays = ["Monday"];
    record.settings.stylists = [
      { id: shared, name: "Shared", specialty: "Hair", availableDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
      { id: other, name: "Other", specialty: "Hair", availableDays: ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], branchId: b },
    ];
    record.settings.services = [
      { id: short, name: "Short", category: "Hair", pricePKR: 2000, durationMinutes: 45, description: "" },
      { id: long, name: "Long", category: "Hair", pricePKR: 4000, durationMinutes: 120, description: "" },
    ];
    const createdWorkspace = await request("/api/workspaces", { cookie: owner, method: "POST", body: { profile: record } });
    assert.equal(createdWorkspace.status, 201, JSON.stringify(createdWorkspace.data));
    created = true;
    const action = (action) => request(`/api/workspaces/${id}/actions`, { cookie: owner, method: "POST", body: { action } });
    let counter = 0;
    const make = (branchId, stylistId, serviceId, date, time) => ({ ...booking(`closure-booking-${++counter}-${suffix}`, id, branchId, time), date, stylistId, stylistName: stylistId === shared ? "Shared" : "Other", serviceId, serviceName: serviceId === short ? "Short" : "Long" });
    const add = (item) => action({ type: "booking.add", booking: item });
    const block = (name, props) => ({ id: `${name}-${suffix}`, scope: "salon", startDate: "2027-05-12", endDate: "2027-05-12", allDay: true, reason: "Holiday", createdAt: new Date().toISOString(), ...props });
    const close = (entry) => action({ type: "schedule.block.add", block: entry });
    const reopen = (entry) => action({ type: "schedule.block.delete", id: entry.id });

    assert.equal((await add(make(a, shared, short, "2027-05-10", "11:00 AM"))).status, 409, "salon weekly off");
    assert.equal((await add(make(b, other, short, "2027-05-11", "11:00 AM"))).status, 409, "staff working days");
    const first = await add(make(a, shared, short, "2027-05-11", "11:00 AM"));
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.workspace.bookings[0].reference, "BK-0001");
    const existingId = first.data.workspace.bookings[0].id;

    const holiday = block("holiday", { endDate: "2027-05-13", note: "Eid" });
    assert.equal((await close(holiday)).status, 200);
    assert.equal((await add(make(a, shared, short, "2027-05-12", "11:00 AM"))).status, 409);
    assert.equal((await add(make(b, other, short, "2027-05-13", "11:00 AM"))).status, 409);
    assert.equal((await add(make(a, shared, long, "2027-05-11", "11:30 PM"))).status, 409, "duration crosses into holiday");
    const loaded = await request(`/api/workspaces/${id}`, { cookie: owner });
    assert.equal(loaded.data.workspace.scheduleBlocks.find((entry) => entry.id === holiday.id).note, "Eid");
    assert.equal((await reopen(holiday)).status, 200);
    assert.equal((await add(make(b, other, short, "2027-05-12", "11:00 AM"))).status, 200);

    const branchBlock = block("branch", { scope: "branch", branchId: a, startDate: "2027-05-14", endDate: "2027-05-14", allDay: false, startTime: "12:00", endTime: "13:00", reason: "Maintenance" });
    assert.equal((await close(branchBlock)).status, 200);
    assert.equal((await add(make(a, shared, short, "2027-05-14", "11:30 AM"))).status, 409, "service overlaps branch closure");
    assert.equal((await add(make(b, shared, short, "2027-05-14", "12:00 PM"))).status, 200, "other branch remains open");
    assert.equal((await add(make(a, shared, short, "2027-05-14", "01:00 PM"))).status, 200, "end is exclusive");

    const staffBlock = block("staff", { scope: "staff", stylistId: shared, startDate: "2027-05-15", endDate: "2027-05-15", allDay: false, startTime: "12:00", endTime: "13:00", reason: "Staff leave" });
    assert.equal((await close(staffBlock)).status, 200);
    assert.equal((await add(make(b, shared, short, "2027-05-15", "12:00 PM"))).status, 409, "staff block covers all branches");
    assert.equal((await add(make(b, other, short, "2027-05-15", "12:00 PM"))).status, 200, "other staff remains available");
    const occupied = block("occupied", { scope: "staff", stylistId: shared, startDate: "2027-05-11", endDate: "2027-05-11", reason: "Staff leave" });
    const rejected = await close(occupied);
    assert.equal(rejected.status, 409);
    assert.match(rejected.data.error, /BK-0001/);
    assert.equal((await action({ type: "booking.status", id: existingId, status: "cancelled" })).status, 200);
    assert.equal((await close(occupied)).status, 200);
    assert.equal((await reopen(occupied)).status, 200);

    const editable = await add(make(a, shared, short, "2027-05-16", "09:00 AM"));
    assert.equal(editable.status, 200);
    const editableId = editable.data.workspace.bookings[0].id;
    const editBlock = block("edit-block", { startDate: "2027-05-16", endDate: "2027-05-16", allDay: false, startTime: "14:00", endTime: "15:00" });
    assert.equal((await close(editBlock)).status, 200);
    assert.equal((await action({ type: "booking.edit", id: editableId, patch: { time: "02:15 PM" } })).status, 409, "editing into a closure");
    const entry = { id: `wait-${suffix}`, salonId: id, branchId: a, customerName: "Wait guest", customerPhone: "", serviceName: "Short", preferredDate: "2027-05-16", preferredTime: "02:00 PM", status: "waiting", createdAt: new Date().toISOString() };
    assert.equal((await action({ type: "waitlist.add", entry })).status, 200);
    assert.equal((await action({ type: "waitlist.offer", id: entry.id })).status, 200);
    const waitBooking = make(a, shared, short, "2027-05-16", "02:00 PM");
    assert.equal((await action({ type: "waitlist.confirm", id: entry.id, booking: waitBooking })).status, 409, "waitlist cannot bypass closures");
    assert.equal((await reopen(editBlock)).status, 200);
    assert.equal((await action({ type: "waitlist.confirm", id: entry.id, booking: waitBooking })).status, 200);

    assert.equal((await close(block("bad-date", { endDate: "2027-02-30" }))).status, 400);
    assert.equal((await close(block("bad-time", { allDay: false, startTime: "14:00", endTime: "13:00" }))).status, 400);
    assert.equal((await close(block("bad-scope", { scope: "branch", branchId: "not-a-branch" }))).status, 400);
    const midnight = block("midnight", { startDate: "2027-05-20", endDate: "2027-05-20", allDay: false, startTime: "23:00", endTime: "00:00" });
    assert.equal((await close(midnight)).status, 200);
    assert.equal((await add(make(a, shared, short, "2027-05-20", "11:30 PM"))).status, 409);
    assert.equal((await add(make(a, shared, short, "2027-05-21", "12:00 AM"))).status, 200);

    const parallel = await Promise.all(["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"].map((time) => add(make(a, shared, short, "2027-05-18", time))));
    assert(parallel.every((result) => result.status === 200), JSON.stringify(parallel.map((result) => result.data)));
    const raceBlock = block("race", { startDate: "2027-05-19", endDate: "2027-05-19", allDay: false, startTime: "11:00", endTime: "12:00" });
    const race = await Promise.all([close(raceBlock), add(make(a, shared, short, "2027-05-19", "11:00 AM"))]);
    assert.deepEqual(race.map((result) => result.status).sort(), [200, 409], "closure and booking serialize under the same lock");
    const final = (await request(`/api/workspaces/${id}`, { cookie: owner })).data.workspace;
    const references = final.bookings.map((item) => item.reference);
    assert(references.every((reference) => /^BK-\d{4,}$/.test(reference)));
    assert.equal(new Set(references).size, references.length);
    const high = final.bookingSequence;
    assert.equal((await action({ type: "booking.delete", id: editableId })).status, 200);
    const afterDelete = await add(make(a, shared, short, "2027-05-22", "11:00 AM"));
    assert.equal(afterDelete.status, 200);
    assert.equal(Number(afterDelete.data.workspace.bookings[0].reference.slice(3)), high + 1, "deleted references are never reused");
  } finally {
    if (owner && created) await request(`/api/workspaces/${id}`, { cookie: owner, method: "DELETE" });
  }
});

test("branch isolation, owner-only customers and opt-in website request confirmation", async () => {
  let owner, managerId, receptionistId, salonCreated = false;
  const unique = randomUUID();
  const salon = `isolation-${unique}`, branchA = `branch-a-${unique}`, branchB = `branch-b-${unique}`;
  const managerAddress = `isolation-manager-${unique}@salon.example`;
  const receptionAddress = `isolation-reception-${unique}@salon.example`;
  const publicDay = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const offDay = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
  const action = (cookie, operation) => request(`/api/workspaces/${salon}/actions`, { cookie, method: "POST", body: { action: operation } });
  try {
    owner = await login(ownerEmail, ownerPassword);
    const record = profile(salon, [{ id: branchA, name: "Visible Branch", area: "Lahore" }, { id: branchB, name: "Private Branch", area: "Lahore" }]);
    delete record.settings.stylists[0].branchId; // shared stylist, must still be conflict-protected
    record.settings.stylists.push({ id: `private-staff-${unique}`, name: "Private Staff", specialty: "Hair", availableDays: [], branchId: branchB });
    const made = await request("/api/workspaces", { cookie: owner, method: "POST", body: { profile: record } });
    assert.equal(made.status, 201, JSON.stringify(made.data));
    salonCreated = true;
    assert.equal((await request("/api/team", { cookie: owner, method: "POST", body: { email: managerAddress, displayName: "No branch", role: "manager", salonId: salon, password } })).status, 400);
    assert.equal((await request("/api/team", { cookie: owner, method: "POST", body: { email: managerAddress, displayName: "Wrong branch", role: "manager", salonId: salon, branchId: ids.b1, password } })).status, 400);
    for (const [email, role] of [[managerAddress, "manager"], [receptionAddress, "reception"]]) {
      const result = await request("/api/team", { cookie: owner, method: "POST", body: { email, displayName: `Isolation ${role}`, role, salonId: salon, branchId: branchA, password } });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      if (role === "manager") managerId = result.data.account.id; else receptionistId = result.data.account.id;
    }
    const manager = await login(managerAddress, password);
    const reception = await login(receptionAddress, password);
    const sharedId = record.settings.stylists[0].id;
    const serviceId = record.settings.services[0].id;
    const privateBooking = { ...booking(`private-booking-${unique}`, salon, branchB, "11:00 AM"), date: publicDay, stylistId: sharedId, serviceId, customerName: "Private Customer XYZ", customerPhone: "03009999999", notes: "Private note" };
    assert.equal((await action(owner, { type: "booking.add", booking: privateBooking })).status, 200);
    const privateWait = { id: `private-wait-${unique}`, salonId: salon, branchId: branchB, customerName: "Private Wait XYZ", customerPhone: "03009999998", serviceName: "Test cut", preferredDate: publicDay, preferredTime: "01:00 PM", status: "waiting", createdAt: new Date().toISOString() };
    assert.equal((await action(owner, { type: "waitlist.add", entry: privateWait })).status, 200);
    assert.equal((await action(owner, { type: "customer.save", customer: { id: `private-customer-${unique}`, branchId: branchB, name: "Private Record XYZ", phone: "03009999997", notes: "Secret record" } })).status, 200);
    const globalBlock = { id: `global-block-${unique}`, scope: "salon", startDate: offDay, endDate: offDay, allDay: false, startTime: "17:00", endTime: "18:00", reason: "Other", note: "Sensitive global note", createdAt: new Date().toISOString() };
    assert.equal((await action(owner, { type: "schedule.block.add", block: globalBlock })).status, 200);

    for (const staff of [manager, reception]) {
      for (const path of ["/api/workspaces", `/api/workspaces/${salon}`]) {
        const result = await request(path, { cookie: staff });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        const scoped = result.data.workspace ?? result.data.workspaces[0];
        assert.deepEqual(scoped.settings.branches.map((b) => b.id), [branchA]);
        assert.deepEqual(scoped.settings.stylists.map((s) => s.id), [sharedId]);
        assert.equal(scoped.bookings.length, 0);
        assert.equal(scoped.waitlist.length, 0);
        assert.equal(scoped.repeatCustomers.length, 0);
        assert.equal(scoped.externalBusy.length, 1);
        const serialized = JSON.stringify(result.data);
        for (const secret of [branchB, "Private Branch", "Private Staff", "Private Customer XYZ", "03009999999", "Private Wait XYZ", "Private Record XYZ", "Sensitive global note", privateBooking.id]) assert(!serialized.includes(secret), `scoped response leaked ${secret}`);
      }
      assert.equal((await action(staff, { type: "booking.status", id: privateBooking.id, status: "cancelled" })).status, 403);
      assert.equal((await action(staff, { type: "waitlist.offer", id: privateWait.id })).status, 403);
      assert.equal((await action(staff, { type: "schedule.block.delete", id: globalBlock.id })).status, 403);
      assert.equal((await action(staff, { type: "schedule.block.add", block: { ...globalBlock, id: `forbidden-${unique}` } })).status, 403);
      assert.equal((await action(staff, { type: "customer.save", customer: { id: `forbidden-customer-${unique}`, branchId: branchA, name: "Not allowed", phone: "", notes: "" } })).status, 403);
    }
    const closureError = await action(manager, { type: "booking.add", booking: { ...privateBooking, id: `global-conflict-${unique}`, branchId: branchA, customerName: "Visible Guest", date: offDay, time: "05:15 PM" } });
    assert.equal(closureError.status, 409);
    assert(!JSON.stringify(closureError.data).includes("Sensitive global note"), "closure conflict must not reveal private global notes");
    const blocked = await action(manager, { type: "booking.add", booking: { ...privateBooking, id: `conflict-${unique}`, branchId: branchA, customerName: "Visible Guest", customerPhone: "" } });
    assert.equal(blocked.status, 409);
    assert(!JSON.stringify(blocked.data).includes("Private Customer XYZ"), "conflict errors must not reveal other branches");
    const staffBlock = { ...globalBlock, id: `branch-staff-${unique}`, scope: "staff", branchId: branchA, stylistId: sharedId, startTime: "13:00", endTime: "14:00", note: "" };
    assert.equal((await action(manager, { type: "schedule.block.add", block: { ...staffBlock, branchId: undefined } })).status, 403);
    assert.equal((await action(manager, { type: "schedule.block.add", block: staffBlock })).status, 200);
    const otherOpen = await action(owner, { type: "booking.add", booking: { ...privateBooking, id: `other-open-${unique}`, date: offDay, time: "01:00 PM" } });
    assert.equal(otherOpen.status, 200, JSON.stringify(otherOpen.data));
    assert.equal((await action(manager, { type: "booking.add", booking: { ...privateBooking, id: `own-closed-${unique}`, branchId: branchA, date: offDay, time: "01:00 PM" } })).status, 409);
    assert.equal((await action(manager, { type: "schedule.block.delete", id: staffBlock.id })).status, 200);

    // Owner can create/edit/delete both manually entered and booking-derived profiles.
    const guest = { ...booking(`own-guest-${unique}`, salon, branchA, "03:00 PM"), date: publicDay, stylistId: sharedId, serviceId, customerName: "History Guest" };
    assert.equal((await action(owner, { type: "booking.add", booking: guest })).status, 200);
    const target = { branchId: branchA, name: "History Guest" };
    const customer = { id: `customer-${unique}`, branchId: branchA, name: "Edited Guest", phone: "03001234567", notes: "Owner note" };
    const saved = await action(owner, { type: "customer.save", previous: target, customer });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert(saved.data.workspace.repeatCustomers.find((c) => c.id === customer.id).aliases.includes("History Guest"));
    assert.equal((await action(manager, { type: "customer.delete", target: { branchId: branchA, name: customer.name, recordId: customer.id } })).status, 403);
    const removed = await action(owner, { type: "customer.delete", target: { branchId: branchA, name: customer.name, recordId: customer.id } });
    assert.equal(removed.status, 200);
    assert(removed.data.workspace.bookings.some((b) => b.id === guest.id), "deleting directory records preserves appointments");
    assert(removed.data.workspace.hiddenCustomers.some((c) => c.nameKey === "history guest"));
    const managerAfter = await action(manager, { type: "booking.status", id: guest.id, status: "completed" });
    assert.equal(managerAfter.status, 200);
    assert(!JSON.stringify(managerAfter.data).includes("Private Customer XYZ"), "mutation responses are scoped too");

    // No public form is available until the owner opts in.
    const formPath = `/book/${salon}`, publicPath = `/api/public/booking/${salon}`;
    assert.equal((await fetch(`${base}${formPath}`)).status, 404);
    const publicRequest = { customerName: "Website Guest", customerPhone: "03001112222", branchId: branchA, serviceId, preferredDate: publicDay, preferredTime: "11:00", consent: true };
    assert.equal((await request(publicPath, { method: "POST", body: publicRequest })).status, 404);
    assert.equal((await action(manager, { type: "public-booking.set", enabled: true })).status, 403);
    assert.equal((await action(owner, { type: "public-booking.set", enabled: true })).status, 200);
    const page = await fetch(`${base}${formPath}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert(html.includes("Appointment request"));
    assert(!html.includes("Private Customer XYZ"), "public form contains no workspace records");
    assert.equal((await request(publicPath, { method: "POST", body: { ...publicRequest, consent: false } })).status, 400);
    assert.equal((await request(publicPath, { method: "POST", body: { ...publicRequest, branchId: "no-such-branch" } })).status, 400);
    assert.equal((await request(publicPath, { method: "POST", body: { ...publicRequest, serviceId: "no-such-service" } })).status, 400);
    assert.equal((await request(publicPath, { method: "POST", body: { ...publicRequest, customerPhone: "abc" } })).status, 400);
    const submitted = await request(publicPath, { method: "POST", body: publicRequest });
    assert.equal(submitted.status, 201, JSON.stringify(submitted.data));
    assert.deepEqual(submitted.data, { ok: true }, "anonymous response exposes no records");
    let managerWorkspace = (await request(`/api/workspaces/${salon}`, { cookie: manager })).data.workspace;
    const incoming = managerWorkspace.waitlist.find((item) => item.source === "website");
    assert(incoming && incoming.status === "waiting");
    assert(!managerWorkspace.bookings.some((item) => item.customerName === "Website Guest"), "request alone never reserves a slot");
    const confirmation = { ...booking(`web-confirm-${unique}`, salon, branchA, "11:00 AM"), date: publicDay, serviceId, stylistId: sharedId, customerName: "Tampered", customerPhone: "1111111" };
    const blockedConfirmation = await action(manager, { type: "waitlist.confirm", id: incoming.id, booking: confirmation });
    assert.equal(blockedConfirmation.status, 409, "shared stylist is already busy in another branch");
    assert(!JSON.stringify(blockedConfirmation.data).includes("Private Customer XYZ"));
    confirmation.time = "12:00 PM";
    const confirmed = await Promise.all([manager, reception].map((staff) => action(staff, { type: "waitlist.confirm", id: incoming.id, booking: confirmation })));
    assert.deepEqual(confirmed.map((r) => r.status).sort(), [200, 409], "one request is confirmed only once");
    managerWorkspace = (await request(`/api/workspaces/${salon}`, { cookie: manager })).data.workspace;
    const webBooking = managerWorkspace.bookings.find((item) => item.id === confirmation.id);
    assert.equal(webBooking.customerName, "Website Guest", "server trusts request details, not forged booking data");
    assert.equal(webBooking.customerPhone, publicRequest.customerPhone);
    assert.equal(managerWorkspace.waitlist.find((item) => item.id === incoming.id).status, "booked");
    assert.equal((await action(owner, { type: "public-booking.set", enabled: false })).status, 200);
    assert.equal((await fetch(`${base}${formPath}`)).status, 404);
    assert.equal((await request(publicPath, { method: "POST", body: publicRequest })).status, 404);

    // Anonymous intake has a best-effort local throttle. A unique fake
    // salon keeps this isolated from real/public intake in repeated test runs.
    const rateStatuses = [];
    for (let attempt = 0; attempt < 26; attempt += 1) {
      rateStatuses.push((await request(`/api/public/booking/rate-${unique}`, { method: "POST", body: { website: "filled honeypot" } })).status);
    }
    assert(rateStatuses.includes(429), "public intake eventually throttles repeated requests");

    // Reassignment affects an existing cookie and cannot grant both branches.
    assert.equal((await request(`/api/team/${managerId}`, { cookie: owner, method: "PATCH", body: { branchId: branchB } })).status, 200);
    const reassigned = (await request(`/api/workspaces/${salon}`, { cookie: manager })).data.workspace;
    assert.deepEqual(reassigned.settings.branches.map((b) => b.id), [branchB]);
    assert(reassigned.bookings.some((b) => b.id === privateBooking.id));
    assert(!JSON.stringify(reassigned).includes("Website Guest"));
    assert.equal((await action(manager, { type: "booking.status", id: confirmation.id, status: "cancelled" })).status, 403);
  } finally {
    if (owner) {
      for (const id of [managerId, receptionistId].filter(Boolean)) await request(`/api/team/${id}`, { cookie: owner, method: "DELETE" });
      if (salonCreated) await request(`/api/workspaces/${salon}`, { cookie: owner, method: "DELETE" });
    }
  }
});


test("owner product catalog, public ordering and private order management", async () => {
  let owner, managerId;
  const unique = randomUUID();
  const salon = `shop-${unique}`, otherSalon = `other-shop-${unique}`, branch = `branch-${unique}`, productId = `product-${unique}`;
  const orderSecret = `Shop Guest ${unique}`;
  const managerMail = `shop-manager-${unique}@salon.example`;
  let created = false, otherCreated = false;
  const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=";
  try {
    owner = await login(ownerEmail, ownerPassword);
    const record = profile(salon, [{ id: branch, name: "Main branch", area: "Lahore" }]);
    record.ownerName = "Private Owner"; record.email = "owner-private@example.test";
    assert.equal((await request("/api/workspaces", { cookie: owner, method: "POST", body: { profile: record } })).status, 201);
    created = true;
    const otherProfile = profile(otherSalon, [{ id: `other-${unique}`, name: "Other", area: "Lahore" }]);
    assert.equal((await request("/api/workspaces", { cookie: owner, method: "POST", body: { profile: otherProfile } })).status, 201);
    otherCreated = true;
    const managerResult = await request("/api/team", { cookie: owner, method: "POST", body: { email: managerMail, displayName: "Shop manager", password, role: "manager", salonId: salon, branchId: branch } });
    assert.equal(managerResult.status, 201); managerId = managerResult.data.account.id;
    const manager = await login(managerMail, password);
    const action = (cookie, action) => request(`/api/workspaces/${salon}/actions`, { cookie, method: "POST", body: { action } });
    const draft = { id: productId, name: `Silk mask ${unique}`, category: "Hair care", description: "A salon product", pricePKR: 2500, imageDataUrl: pixel, published: false, version: 0 };
    assert.equal((await action(manager, { type: "shop.product.save", product: draft })).status, 403);
    assert.equal((await action(owner, { type: "shop.product.save", product: { ...draft, pricePKR: -1 } })).status, 400);
    assert.equal((await action(owner, { type: "shop.product.save", product: { ...draft, imageDataUrl: "data:image/svg+xml;base64,PHN2Zz4=" } })).status, 400);
    const savedDraft = await action(owner, { type: "shop.product.save", product: draft });
    assert.equal(savedDraft.status, 200, JSON.stringify(savedDraft.data));
    assert.equal(savedDraft.data.workspace.products[0].version, 1);
    const listDraft = await request("/api/public/products");
    assert.equal(listDraft.status, 200);
    assert(!listDraft.data.products.some((product) => product.id === productId), "unpublished drafts never appear publicly");
    assert.equal((await fetch(`${base}/products/${salon}/${productId}`)).status, 404);
    assert.equal((await fetch(`${base}/api/public/products/${salon}/${productId}/image`)).status, 404);
    const publish = await action(owner, { type: "shop.product.save", product: { ...draft, published: true, version: 1 } });
    assert.equal(publish.status, 200);
    assert.equal((await action(owner, { type: "shop.product.save", product: { ...draft, published: true, version: 1 } })).status, 409, "stale product updates do not overwrite changes");
    const publicList = await request("/api/public/products");
    const visible = publicList.data.products.find((product) => product.id === productId);
    assert.equal(visible.salonId, salon); assert.equal(visible.pricePKR, 2500); assert.equal(visible.version, 2);
    assert(!JSON.stringify(publicList.data).includes("owner-private@example.test"));
    assert(!JSON.stringify(publicList.data).includes(pixel), "public list uses an image endpoint, not workspace documents");
    const image = await fetch(`${base}${visible.imageUrl}`);
    assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/png"); assert((await image.arrayBuffer()).byteLength > 0);
    const shopPage = await fetch(`${base}/products`); assert.equal(shopPage.status, 200); assert((await shopPage.text()).includes(draft.name));
    assert.equal((await fetch(`${base}/products/${salon}/${productId}`)).status, 200);
    const publicPath = `/api/public/orders/${salon}`;
    const body = { productId, productVersion: 2, requestKey: randomUUID(), quantity: 2, customerName: orderSecret, customerPhone: "03001234567", deliveryAddress: "Test Street, Lahore", notes: "Please call", consent: true, unitPricePKR: 1 };
    assert.equal((await request(`/api/public/orders/${otherSalon}`, { method: "POST", body })).status, 404, "a product cannot be ordered through another salon");
    for (const invalid of [{ ...body, consent: false }, { ...body, quantity: 0 }, { ...body, quantity: 1.5 }, { ...body, customerPhone: "bad" }, { ...body, deliveryAddress: "" }, { ...body, productId: "missing" }]) {
      const result = await request(publicPath, { method: "POST", body: invalid }); assert([400, 404].includes(result.status), JSON.stringify(result.data));
    }
    const requests = await Promise.all([1, 2].map(() => request(publicPath, { method: "POST", body })));
    assert.deepEqual(requests.map((item) => item.status), [201, 201]);
    assert.equal(requests[0].data.reference, requests[1].data.reference, "retry key is idempotent");
    const orderReference = requests[0].data.reference;
    assert.match(orderReference, /^ORD-\d+$/);
    assert(!JSON.stringify(requests).includes(orderSecret), "anonymous response returns only acknowledgement and reference");
    assert.equal((await request(publicPath, { method: "POST", body: { ...body, quantity: 3 } })).status, 409, "reused key cannot mutate an order");
    let workspace = (await request(`/api/workspaces/${salon}`, { cookie: owner })).data.workspace;
    assert.equal(workspace.productOrders.length, 1); const order = workspace.productOrders[0];
    assert.equal(order.status, "pending"); assert.equal(order.reference, orderReference); assert.equal(order.productName, draft.name);
    assert.equal(order.unitPricePKR, 2500); assert.equal(order.totalPKR, 5000, "server snapshots price, not client supplied value");
    const staffWorkspace = (await request(`/api/workspaces/${salon}`, { cookie: manager })).data.workspace;
    assert.equal(staffWorkspace.productOrders, undefined); assert.equal(staffWorkspace.products, undefined);
    assert(!JSON.stringify(staffWorkspace).includes(orderSecret), "branch staff cannot read salon-wide order details");
    const staffBlock = { id: `shop-block-${unique}`, scope: "branch", branchId: branch, startDate: "2028-04-03", endDate: "2028-04-03", allDay: true, reason: "Holiday", createdAt: new Date().toISOString() };
    const staffMutation = await action(manager, { type: "schedule.block.add", block: staffBlock });
    assert.equal(staffMutation.status, 200); assert(!JSON.stringify(staffMutation.data).includes(orderSecret), "mutation responses omit order details too");
    assert.equal((await action(manager, { type: "shop.order.status", id: order.id, status: "confirmed" })).status, 403);
    assert.equal((await action(owner, { type: "shop.order.status", id: order.id, status: "fulfilled" })).status, 409);
    assert.equal((await action(owner, { type: "shop.order.delete", id: order.id })).status, 409);
    const changed = await action(owner, { type: "shop.product.save", product: { ...draft, name: "Updated mask", pricePKR: 3200, published: true, version: 2 } });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.workspace.productOrders[0].productName, draft.name);
    assert.equal(changed.data.workspace.productOrders[0].unitPricePKR, 2500, "existing order keeps price/name snapshot");
    assert.equal((await request(publicPath, { method: "POST", body: { ...body, requestKey: randomUUID() } })).status, 409, "stale displayed price is rejected");
    assert.equal((await request(publicPath, { method: "POST", body })).data.reference, orderReference, "retry works even after product edit");
    assert.equal((await action(owner, { type: "shop.order.status", id: order.id, status: "confirmed" })).status, 200);
    assert.equal((await action(owner, { type: "shop.order.status", id: order.id, status: "fulfilled" })).status, 200);
    assert.equal((await action(owner, { type: "shop.order.delete", id: order.id })).status, 200);
    const second = await request(publicPath, { method: "POST", body: { ...body, productVersion: 3, requestKey: randomUUID() } });
    assert.equal(second.status, 201); assert.notEqual(second.data.reference, orderReference, "order numbers are not reused");
    const unpublish = await action(owner, { type: "shop.product.save", product: { ...draft, name: "Updated mask", pricePKR: 3200, published: false, version: 3 } });
    assert.equal(unpublish.status, 200);
    assert.equal((await fetch(`${base}/api/public/products/${salon}/${productId}/image`)).status, 404);
    assert.equal((await fetch(`${base}/products/${salon}/${productId}`)).status, 404);
    assert.equal((await request(publicPath, { method: "POST", body: { ...body, productVersion: 4, requestKey: randomUUID() } })).status, 404);
    assert.equal((await action(owner, { type: "shop.product.delete", id: productId, version: 3 })).status, 409);
    const removed = await action(owner, { type: "shop.product.delete", id: productId, version: 4 });
    assert.equal(removed.status, 200); assert.equal(removed.data.workspace.productOrders.length, 1, "deleting product preserves order records");
    const raceProduct = { ...draft, id: `race-${unique}`, pricePKR: 1000, imageDataUrl: undefined, published: true, version: 0 };
    assert.equal((await action(owner, { type: "shop.product.save", product: raceProduct })).status, 200);
    const raceBody = { ...body, productId: raceProduct.id, productVersion: 1, requestKey: randomUUID() };
    const [priceChange, raceOrder] = await Promise.all([
      action(owner, { type: "shop.product.save", product: { ...raceProduct, pricePKR: 2000, version: 1 } }),
      request(publicPath, { method: "POST", body: raceBody }),
    ]);
    assert.equal(priceChange.status, 200); assert([201, 409].includes(raceOrder.status));
    workspace = (await request(`/api/workspaces/${salon}`, { cookie: owner })).data.workspace;
    if (raceOrder.status === 201) assert.equal(workspace.productOrders.find((item) => item.reference === raceOrder.data.reference).unitPricePKR, 1000);
    const newPrice = await request(publicPath, { method: "POST", body: { ...raceBody, productVersion: 2, requestKey: randomUUID() } });
    assert.equal(newPrice.status, 201);
    workspace = (await request(`/api/workspaces/${salon}`, { cookie: owner })).data.workspace;
    assert.equal(workspace.productOrders.find((item) => item.reference === newPrice.data.reference).unitPricePKR, 2000, "racing price edits cannot produce an order with a forged/mismatched price");
    const honeypotPath = `/api/public/orders/rate-${unique}`;
    const statuses = [];
    for (let i = 0; i < 26; i += 1) statuses.push((await request(honeypotPath, { method: "POST", body: { website: "bot" } })).status);
    assert(statuses.includes(429), "public orders have a best-effort local throttle");
  } finally {
    if (owner) {
      if (managerId) await request(`/api/team/${managerId}`, { cookie: owner, method: "DELETE" });
      if (created) await request(`/api/workspaces/${salon}`, { cookie: owner, method: "DELETE" });
      if (otherCreated) await request(`/api/workspaces/${otherSalon}`, { cookie: owner, method: "DELETE" });
    }
  }
});
