// Profile field schema: grouped fields for the control panel UI, plus
// synonym lists used only by the local fallback matcher (matcher-fallback.js)
// when no Gemini API key is configured or a Gemini call fails.

export const PROFILE_GROUPS = [
  {
    key: "personal",
    label: "Personal Information",
    repeatable: false,
    fields: [
      { key: "firstName", label: "First Name", type: "text", synonyms: ["first name", "given name", "forename", "fname"] },
      { key: "middleName", label: "Middle Name", type: "text", synonyms: ["middle name", "mname"] },
      { key: "lastName", label: "Last Name", type: "text", synonyms: ["last name", "surname", "family name", "lname"] },
      { key: "preferredName", label: "Preferred Name", type: "text", synonyms: ["preferred name", "nickname"] },
      { key: "dob", label: "Date of Birth", type: "date", synonyms: ["date of birth", "dob", "birth date", "birthdate"] },
      { key: "gender", label: "Gender", type: "select", synonyms: ["gender", "sex"] },
      { key: "nationality", label: "Nationality", type: "text", synonyms: ["nationality", "citizenship", "country of citizenship"] },
      { key: "email", label: "Email", type: "text", synonyms: ["email", "e-mail", "email address"] },
      { key: "phone", label: "Phone", type: "text", synonyms: ["phone", "telephone", "mobile", "cell", "phone number"] },
    ],
  },
  {
    key: "address",
    label: "Address",
    repeatable: false,
    fields: [
      { key: "street", label: "Street Address", type: "text", synonyms: ["street address", "address line 1", "street"] },
      { key: "city", label: "City", type: "text", synonyms: ["city", "town"] },
      { key: "state", label: "State / Province", type: "text", synonyms: ["state", "province", "region"] },
      { key: "postalCode", label: "Postal Code", type: "text", synonyms: ["postal code", "zip", "zip code", "postcode"] },
      { key: "country", label: "Country", type: "select", synonyms: ["country", "country of residence"] },
    ],
  },
  {
    key: "education",
    label: "Education",
    repeatable: true,
    fields: [
      { key: "institution", label: "Institution", type: "text", synonyms: ["institution", "school", "university", "college"] },
      { key: "degree", label: "Degree", type: "text", synonyms: ["degree", "qualification"] },
      { key: "major", label: "Major / Field of Study", type: "text", synonyms: ["major", "field of study", "concentration"] },
      { key: "gpa", label: "GPA", type: "text", synonyms: ["gpa", "grade point average", "cgpa"] },
      { key: "startDate", label: "Start Date", type: "date", synonyms: ["start date", "from"] },
      { key: "endDate", label: "End Date", type: "date", synonyms: ["end date", "graduation date", "to"] },
    ],
  },
  {
    key: "experience",
    label: "Qualifications & Experience",
    repeatable: true,
    fields: [
      { key: "title", label: "Job Title / Role", type: "text", synonyms: ["job title", "position", "role"] },
      { key: "organization", label: "Organization", type: "text", synonyms: ["organization", "employer", "company"] },
      { key: "startDate", label: "Start Date", type: "date", synonyms: ["start date", "from"] },
      { key: "endDate", label: "End Date", type: "date", synonyms: ["end date", "to", "present"] },
      { key: "description", label: "Description", type: "textarea", synonyms: ["description", "responsibilities", "summary"] },
    ],
  },
  {
    key: "desiredDegrees",
    label: "Desired Degrees",
    repeatable: true,
    fields: [
      { key: "program", label: "Target Program / Degree", type: "text", synonyms: ["program", "degree sought", "intended degree"] },
      { key: "fieldOfStudy", label: "Field of Study", type: "text", synonyms: ["field of study", "major", "specialization"] },
      { key: "intakeTerm", label: "Target Intake Term", type: "text", synonyms: ["intake", "term", "start term", "semester"] },
    ],
  },
  {
    key: "testScores",
    label: "Test Scores",
    repeatable: true,
    fields: [
      { key: "examType", label: "Exam Type", type: "text", synonyms: ["exam type", "test name", "test type"] },
      { key: "score", label: "Score", type: "text", synonyms: ["score", "total score", "result"] },
      { key: "testDate", label: "Test Date", type: "date", synonyms: ["test date", "date taken"] },
    ],
  },
  {
    key: "references",
    label: "References",
    repeatable: true,
    fields: [
      { key: "name", label: "Name", type: "text", synonyms: ["reference name", "recommender name"] },
      { key: "email", label: "Email", type: "text", synonyms: ["reference email", "recommender email"] },
      { key: "phone", label: "Phone", type: "text", synonyms: ["reference phone", "recommender phone"] },
      { key: "relationship", label: "Relationship", type: "text", synonyms: ["relationship", "how do you know"] },
    ],
  },
  {
    key: "documents",
    label: "Documents & Background Snippets",
    repeatable: true,
    fields: [
      { key: "title", label: "Title", type: "text", synonyms: [] },
      { key: "content", label: "Content", type: "textarea", synonyms: [] },
    ],
  },
];

export function emptyProfile() {
  const profile = {};
  for (const group of PROFILE_GROUPS) {
    profile[group.key] = group.repeatable ? [] : {};
  }
  return profile;
}

// Rough completeness proxy: non-repeatable fields count individually,
// each repeatable group counts as one unit (satisfied once it has an entry).
export function computeCompleteness(profile) {
  let satisfied = 0;
  let total = 0;

  for (const group of PROFILE_GROUPS) {
    if (group.repeatable) {
      total += 1;
      if ((profile[group.key] || []).length > 0) satisfied += 1;
    } else {
      const entry = profile[group.key] || {};
      for (const field of group.fields) {
        total += 1;
        if (entry[field.key]) satisfied += 1;
      }
    }
  }

  return total === 0 ? 0 : Math.round((satisfied / total) * 100);
}
