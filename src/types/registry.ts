export type SalonImageKind = "logo" | "interior" | "team" | "service" | "other";

/** A resized salon image saved with its workspace profile. */
export interface RegisteredSalonImage {
  id: string;
  name: string;
  kind: SalonImageKind;
  dataUrl: string;
  sizeBytes: number;
  uploadedAt: string;
}
