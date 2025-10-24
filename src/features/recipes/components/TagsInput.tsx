import React, { useMemo, useState } from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";

export interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  label?: string;
  placeholder?: string;
}

function normalizeTag(t: string) {
  // trim, collapse internal spaces, keep case as entered for display,
  // but we compare case-insensitively when de-duping
  return t.trim().replace(/\s+/g, " ").slice(0, 60);
}

export default function TagsInput({
  value,
  onChange,
  suggestions = [],
  label,
  placeholder,
}: TagsInputProps) {
  const [input, setInput] = useState("");

  const lowerSet = useMemo(
    () => new Set(value.map((v) => v.toLocaleLowerCase())),
    [value]
  );

  const filteredSuggestions = useMemo(() => {
    const q = input.toLocaleLowerCase();
    return suggestions
      .filter(Boolean)
      .filter((s) => !lowerSet.has(s.toLocaleLowerCase()))
      .filter((s) => (q ? s.toLocaleLowerCase().includes(q) : true))
      .sort((a, b) => a.localeCompare(b));
  }, [suggestions, lowerSet, input]);

  function addTag(raw: string) {
    const t = normalizeTag(raw);
    if (!t) return;
    if (lowerSet.has(t.toLocaleLowerCase())) return;
    onChange([...value, t]);
  }

  function tryCommitBuffered() {
    if (input.trim()) {
      addTag(input);
      setInput("");
    }
  }

  return (
    <Autocomplete
      multiple
      freeSolo
      options={filteredSuggestions}
      value={value}
      onChange={(_e, next) => {
        // next can include raw strings from freeSolo and existing chips
        const cleaned = next
          .map((n) => normalizeTag(typeof n === "string" ? n : String(n)))
          .filter(Boolean);
        // de-dupe case-insensitively while preserving first-entered casing
        const seen = new Set<string>();
        const uniq: string[] = [];
        for (const t of cleaned) {
          const k = t.toLocaleLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            uniq.push(t);
          }
        }
        onChange(uniq);
      }}
      inputValue={input}
      onInputChange={(_e, v) => setInput(v)}
      filterOptions={(x) => x} // we already filtered
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip variant="outlined" label={option} {...getTagProps({ index })} />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              tryCommitBuffered();
            }
          }}
        />
      )}
    />
  );
}