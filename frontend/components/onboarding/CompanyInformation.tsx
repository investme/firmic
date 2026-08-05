export type CompanyInformationData = {
  name: string;
  industry: string;
  country: string;
  jurisdiction: string;
};

type CompanyInformationProps = {
  value: CompanyInformationData;
  onChange: (value: CompanyInformationData) => void;
};

export default function CompanyInformation({
  value,
  onChange,
}: CompanyInformationProps) {
  function update(field: keyof CompanyInformationData, fieldValue: string) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <div>
        <p className="text-sm font-bold text-violet-700">Company Information</p>

        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          Tell us about your company.
        </h2>

        <p className="mt-2 text-slate-500">
          Additional formation and compliance information will be completed
          through the Launch Center.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field
          label="Company name"
          value={value.name}
          placeholder="Example Technologies"
          onChange={(nextValue) => update("name", nextValue)}
          required
        />

        <Field
          label="Industry"
          value={value.industry}
          placeholder="Technology"
          onChange={(nextValue) => update("industry", nextValue)}
          required
        />

        <SelectField
          label="Country"
          value={value.country}
          onChange={(nextValue) => update("country", nextValue)}
          options={[
            "United Arab Emirates",
            "Saudi Arabia",
            "Qatar",
            "Bahrain",
            "Kuwait",
            "Oman",
            "Lebanon",
            "United Kingdom",
            "United States",
          ]}
        />

        <Field
          label="Jurisdiction"
          value={value.jurisdiction}
          placeholder="Abu Dhabi"
          onChange={(nextValue) => update("jurisdiction", nextValue)}
          required
        />
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
