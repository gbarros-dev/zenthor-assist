interface ToolPolicy {
  allow?: string[];
  deny?: string[];
}

export function getDefaultPolicy(channel: "web" | "whatsapp"): ToolPolicy {
  // For now, both channels get the same permissive policy.
  // WhatsApp deny list can be extended later for UI-dependent tools.
  if (channel === "whatsapp") {
    return {};
  }
  return {};
}

export function filterTools<T extends Record<string, unknown>>(
  tools: T,
  policy: ToolPolicy,
): Partial<T> {
  const toolNames = Object.keys(tools);
  const filtered: Partial<T> = {} as Partial<T>;

  for (const name of toolNames) {
    // Deny takes precedence
    if (policy.deny?.includes(name)) continue;
    // If allow list is set, only include tools in the list
    if (policy.allow && !policy.allow.includes(name)) continue;
    (filtered as Record<string, unknown>)[name] = tools[name];
  }

  return filtered;
}

export function mergeToolPolicies(...policies: ToolPolicy[]): ToolPolicy {
  let allow: string[] | undefined;
  let deny: string[] | undefined;

  for (const policy of policies) {
    if (policy.deny) {
      deny = [...(deny ?? []), ...policy.deny];
    }
    if (policy.allow) {
      if (allow === undefined) {
        allow = [...policy.allow];
      } else {
        // Intersect: only keep names present in both
        allow = allow.filter((name) => policy.allow!.includes(name));
      }
    }
  }

  return {
    ...(allow !== undefined && { allow }),
    ...(deny !== undefined && { deny: [...new Set(deny)] }),
  };
}
