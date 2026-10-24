import { Field, Select } from "./ui";
import { ROLES, TARGET_ROLES } from "@/shared/roles";

export function RoleFields({ currentRole, targetRole }: { currentRole?: string | null; targetRole?: string | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Current role">
        <Select name="currentRole" defaultValue={currentRole ?? ""} required>
          <option value="" disabled>
            Choose…
          </option>
          {ROLES.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </Select>
      </Field>
      <Field label="Target role" hint="The role you're working towards.">
        <Select name="targetRole" defaultValue={targetRole ?? ""} required>
          <option value="" disabled>
            Choose…
          </option>
          {TARGET_ROLES.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
