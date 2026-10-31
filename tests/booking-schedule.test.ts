import test from "node:test";
import assert from "node:assert/strict";
import { blockConflictsWithBooking, findScheduleClosure } from "../src/lib/booking-schedule";
import { applyAction, sampleWorkspace, withBookingReferences, type SalonWorkspace } from "../src/lib/workspaces/model";
import { customerProfiles } from "../src/lib/customers";
import { scopeWorkspace } from "../src/lib/workspaces/access";
import type { ScheduleBlock } from "../src/types/salon";

test("legacy internal IDs get stable, unique short references without reusing deleted numbers", () => {
  const original = sampleWorkspace();
  const template = original.bookings[0];
  const legacy = {
    ...original,
    bookingSequence: undefined,
    bookings: [
      { ...template, id: "BK-11111111-1111-4111-8111-111111111111", reference: undefined },
      { ...template, id: "BK-9401", reference: undefined },
      { ...template, id: "BK-22222222-2222-4222-8222-222222222222", reference: undefined },
    ],
  };
  const migrated = withBookingReferences(legacy);
  assert.deepEqual(migrated.bookings.map((booking) => booking.reference), ["BK-9402", "BK-9401", "BK-9403"]);
  assert.deepEqual(migrated.bookings.map((booking) => booking.id), legacy.bookings.map((booking) => booking.id));
  assert.equal(migrated.bookingSequence, 9403);
  assert.strictEqual(withBookingReferences(migrated), migrated);
  const afterDeletion = withBookingReferences({ ...migrated, bookings: migrated.bookings.slice(1) });
  assert.equal(afterDeletion.bookingSequence, 9403);
  assert.deepEqual(afterDeletion.bookings.map((booking) => booking.reference), ["BK-9401", "BK-9403"]);
  const duplicate = withBookingReferences({ ...migrated, bookings: migrated.bookings.map((booking, index) => index === 2 ? { ...booking, reference: "BK-9402" } : booking) });
  assert.equal(new Set(duplicate.bookings.map((booking) => booking.reference)).size, 3);
  assert.equal(duplicate.bookings[2].reference, "BK-9404");
});

test("weekly off, staff working days and timed blocks cover complete intervals including midnight", () => {
  const workspace = sampleWorkspace();
  const stylist = workspace.settings.stylists[0];
  const target = { stylistId: stylist.id, stylistName: stylist.name, branchId: workspace.settings.branches[0].id };
  const settings = { ...workspace.settings, offDays: ["Monday"], stylists: workspace.settings.stylists.map((person) => person.id === stylist.id ? { ...person, availableDays: ["Wednesday", "Thursday"] } : person) };
  assert.equal(findScheduleClosure(settings, [], target, "2027-05-10", "11:00 AM", 30)?.kind, "weekly-off");
  assert.equal(findScheduleClosure(settings, [], target, "2027-05-11", "11:00 AM", 30)?.kind, "staff-off");
  assert.equal(findScheduleClosure(settings, [], target, "2027-05-12", "11:00 AM", 30), null);
  const block: ScheduleBlock = { id: "holiday", scope: "branch", branchId: target.branchId, startDate: "2027-05-13", endDate: "2027-05-13", allDay: false, startTime: "00:00", endTime: "01:00", reason: "Maintenance", createdAt: "now" };
  assert.equal(findScheduleClosure(settings, [block], target, "2027-05-12", "11:30 PM", 120)?.block?.id, block.id);
  assert.equal(findScheduleClosure(settings, [block], target, "2027-05-13", "01:00 AM", 30), null);
  const booking = { ...workspace.bookings[0], branchId: target.branchId, stylistId: stylist.id, stylistName: stylist.name, date: "2027-05-12", time: "11:30 PM", durationMinutes: 120, status: "confirmed" as const };
  assert.equal(blockConflictsWithBooking(block, booking, settings), true);
  assert.equal(blockConflictsWithBooking(block, { ...booking, status: "cancelled" }, settings), false);
});


test("branch-scoped staff time off does not close a shared staff member in other branches", () => {
  const workspace = sampleWorkspace();
  const stylist = workspace.settings.stylists[1];
  const [a, b] = workspace.settings.branches;
  const block: ScheduleBlock = { id: "staff-branch", scope: "staff", branchId: a.id, stylistId: stylist.id, startDate: "2027-05-12", endDate: "2027-05-12", allDay: true, reason: "Staff leave", createdAt: "now" };
  const settings = { ...workspace.settings, offDays: [], stylists: workspace.settings.stylists.map((person) => person.id === stylist.id ? { ...person, availableDays: [] } : person) };
  assert(findScheduleClosure(settings, [block], { branchId: a.id, stylistId: stylist.id, stylistName: stylist.name }, "2027-05-12", "11:00", 60));
  assert.equal(findScheduleClosure(settings, [block], { branchId: b.id, stylistId: stylist.id, stylistName: stylist.name }, "2027-05-12", "11:00", 60), null);
});

test("customer directory edits preserve legacy booking history; deletion does not resurrect profiles", () => {
  const sample = sampleWorkspace();
  const branch = sample.settings.branches[0].id;
  const other = sample.settings.branches[1].id;
  const template = sample.bookings[0];
  let workspace: SalonWorkspace = { ...sample, repeatCustomers: [], hiddenCustomers: [], bookings: [
    { ...template, id: "old-booking", reference: "BK-0001", branchId: branch, customerName: "Old Guest", customerPhone: "03001234567", status: "confirmed" as const },
    { ...template, id: "other-booking", reference: "BK-0002", branchId: other, customerName: "Old Guest", status: "confirmed" as const },
  ] };
  assert.equal(customerProfiles(workspace).length, 2, "same name in another branch is separate");
  workspace = applyAction(workspace, { type: "customer.save", previous: { branchId: branch, name: "Old Guest" }, customer: { id: "customer-1", branchId: branch, name: "Renamed Guest", phone: "03001234567", notes: "Prefers mornings" } });
  const renamed = customerProfiles(workspace, branch);
  assert.equal(renamed.length, 1);
  assert.equal(renamed[0].name, "Renamed Guest");
  assert.equal(renamed[0].bookings[0].customerName, "Old Guest");
  workspace = applyAction(workspace, { type: "customer.delete", target: { branchId: branch, name: "Renamed Guest", recordId: "customer-1" } });
  assert.equal(customerProfiles(workspace, branch).length, 0);
  assert.equal(customerProfiles(workspace, other).length, 1);
  assert.equal(workspace.bookings.length, 2, "appointments remain intact");
  workspace = applyAction(workspace, { type: "customer.save", customer: { id: "customer-2", branchId: branch, name: "Old Guest", phone: "", notes: "" } });
  assert.equal(customerProfiles(workspace, branch)[0].bookings.length, 1, "explicitly re-adding the guest restores that name");
});


test("branch-scoped staff get anonymous conflict intervals even after a stylist is reassigned", () => {
  const original = sampleWorkspace();
  const [a, b] = original.settings.branches;
  const stylist = { ...original.settings.stylists[0], branchId: a.id };
  const privateBooking = { ...original.bookings[0], id: "private-id", stylistId: stylist.id, stylistName: stylist.name, branchId: b.id, customerName: "Private Person", customerPhone: "03001234567", notes: "Private note" };
  const workspace: SalonWorkspace = { ...original, settings: { ...original.settings, stylists: [stylist] }, bookings: [privateBooking] };
  const user = { id: "manager", email: "manager@example.test", displayName: "Manager", role: "manager" as const, salonId: workspace.id, branchId: a.id, backend: "memory" as const };
  const scoped = scopeWorkspace(workspace, user)!;
  assert.equal(scoped.externalBusy?.length, 1);
  assert.equal(scoped.bookings.length, 0);
  const body = JSON.stringify(scoped);
  for (const secret of [privateBooking.id, privateBooking.customerName, privateBooking.customerPhone, privateBooking.notes]) assert(!body.includes(secret));
});


test("deleting a manually added customer without bookings leaves no name exclusion", () => {
  const sample = sampleWorkspace();
  const branchId = sample.settings.branches[0].id;
  let workspace = applyAction(sample, { type: "customer.save", customer: { id: "manual-only", branchId, name: "No History", phone: "03001112222", notes: "Private" } });
  workspace = applyAction(workspace, { type: "customer.delete", target: { branchId, name: "No History", recordId: "manual-only" } });
  assert(!JSON.stringify(workspace).includes("No History"));
  assert(!JSON.stringify(workspace).includes("03001112222"));
  assert(!workspace.hiddenCustomers?.some((item) => item.nameKey === "no history"));
});
