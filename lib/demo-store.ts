export type MatchStatus = "open" | "full" | "confirmed";
export type ApplicationStatus = "sent" | "approved" | "rejected";
export type UserRole = "admin" | "referee";

export type DemoUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
};

export type StoredMatch = {
  id: string;
  date: string; // dd.mm.yyyy
  time: string;
  competition: string;
  home: string;
  away: string;
  location: string;
  neededRefs: number;
};

export type Match = StoredMatch & {
  applicants: number;
  approved: number;
  status: MatchStatus;
};

export type Application = {
  id: string;
  matchId: string;
  refereeName: string;
  appliedAt: string;
  status: ApplicationStatus;
};

export type Delegation = {
  id: string;
  matchId: string;
  date: string;
  time: string;
  competition: string;
  home: string;
  away: string;
  location: string;
  mainReferee: string;
  assistants: string[];
};

const MATCHES_KEY = "reffguard-demo-matches";
const APPLICATIONS_KEY = "reffguard-demo-applications";
const USERS_KEY = "reffguard-demo-users";

const defaultUsers: DemoUser[] = [
  {
    id: "admin-1",
    fullName: "Administrátor",
    email: "admin@demo.cz",
    phone: "+420 111 222 333",
    role: "admin",
  },
  {
    id: "ref-jan",
    fullName: "Jan Novák",
    email: "jan@demo.cz",
    phone: "+420 123 456 789",
    role: "referee",
  },
  {
    id: "ref-petr",
    fullName: "Petr Svoboda",
    email: "petr@demo.cz",
    phone: "+420 222 333 444",
    role: "referee",
  },
  {
    id: "ref-martin",
    fullName: "Martin Dvořák",
    email: "martin@demo.cz",
    phone: "+420 333 444 555",
    role: "referee",
  },
  {
    id: "ref-karel",
    fullName: "Karel Beneš",
    email: "karel@demo.cz",
    phone: "+420 444 555 666",
    role: "referee",
  },
  {
    id: "ref-lukas",
    fullName: "Lukáš Malý",
    email: "lukas@demo.cz",
    phone: "+420 555 666 777",
    role: "referee",
  },
];

const defaultMatches: StoredMatch[] = [
  {
    id: "1",
    date: "28.04.2026",
    time: "14:00",
    competition: "1. A třída",
    home: "Mladost",
    away: "Sloga",
    location: "Praha 10",
    neededRefs: 3,
  },
  {
    id: "2",
    date: "28.04.2026",
    time: "16:30",
    competition: "Krajský přebor",
    home: "Radnički",
    away: "Borac",
    location: "Praha 4",
    neededRefs: 3,
  },
  {
    id: "3",
    date: "29.04.2026",
    time: "11:00",
    competition: "Dorost",
    home: "Tempo",
    away: "Slovan",
    location: "Praha 5",
    neededRefs: 1,
  },
];

const defaultApplications: Application[] = [
  {
    id: "a1",
    matchId: "1",
    refereeName: "Jan Novák",
    appliedAt: "22.04.2026 09:15",
    status: "sent",
  },
  {
    id: "a2",
    matchId: "1",
    refereeName: "Petr Svoboda",
    appliedAt: "22.04.2026 09:18",
    status: "approved",
  },
  {
    id: "a3",
    matchId: "1",
    refereeName: "Martin Dvořák",
    appliedAt: "22.04.2026 09:20",
    status: "sent",
  },
  {
    id: "a4",
    matchId: "2",
    refereeName: "Jan Novák",
    appliedAt: "22.04.2026 09:25",
    status: "approved",
  },
  {
    id: "a5",
    matchId: "2",
    refereeName: "Karel Beneš",
    appliedAt: "22.04.2026 10:00",
    status: "sent",
  },
  {
    id: "a6",
    matchId: "3",
    refereeName: "Jan Novák",
    appliedAt: "22.04.2026 09:40",
    status: "rejected",
  },
];

function hasWindow() {
  return typeof window !== "undefined";
}

function formatNow() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function isoToDisplayDate(value: string) {
  if (!value) return "";
  const [yyyy, mm, dd] = value.split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}.${mm}.${yyyy}`;
}

export function displayToIsoDate(value: string) {
  if (!value) return "";
  const parts = value.split(".");
  if (parts.length !== 3) return value;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!hasWindow()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function initializeDemoStore() {
  readJSON(MATCHES_KEY, defaultMatches);
  readJSON(APPLICATIONS_KEY, defaultApplications);
  readJSON(USERS_KEY, defaultUsers);
}

export function getUsers() {
  return readJSON<DemoUser[]>(USERS_KEY, defaultUsers);
}

export function saveUsers(users: DemoUser[]) {
  writeJSON(USERS_KEY, users);
}

export function getReferees() {
  return getUsers().filter((user) => user.role === "referee");
}

export function getUserByName(name: string) {
  return getUsers().find((user) => user.fullName === name) ?? null;
}

export function updateUserRole(userId: string, role: UserRole) {
  const users = getUsers().map((user) => (user.id === userId ? { ...user, role } : user));
  saveUsers(users);
}

export function updateUserProfile(userId: string, data: { fullName: string; phone?: string }) {
  const users = getUsers().map((user) =>
    user.id === userId
      ? {
          ...user,
          fullName: data.fullName,
          phone: data.phone,
        }
      : user
  );
  saveUsers(users);
}

export function getCurrentDemoUser(role: UserRole, name: string) {
  const users = getUsers();
  return users.find((user) => user.fullName === name) ?? users.find((user) => user.role === role) ?? users[0];
}

export function getStoredMatches() {
  return readJSON<StoredMatch[]>(MATCHES_KEY, defaultMatches);
}

export function saveStoredMatches(matches: StoredMatch[]) {
  writeJSON(MATCHES_KEY, matches);
}

export function getApplications() {
  return readJSON<Application[]>(APPLICATIONS_KEY, defaultApplications);
}

export function saveApplications(applications: Application[]) {
  writeJSON(APPLICATIONS_KEY, applications);
}

export function getMatches(): Match[] {
  const matches = getStoredMatches();
  const applications = getApplications();

  return matches.map((match) => {
    const matchApps = applications.filter((app) => app.matchId === match.id && app.status !== "rejected");
    const approved = matchApps.filter((app) => app.status === "approved").length;
    const applicants = matchApps.length;

    let status: MatchStatus = "open";
    if (approved >= match.neededRefs) {
      status = "confirmed";
    } else if (applicants >= match.neededRefs) {
      status = "full";
    }

    return {
      ...match,
      applicants,
      approved,
      status,
    };
  });
}

export function createMatch(data: Omit<StoredMatch, "id">, approvedRefereeNames: string[] = []) {
  const matches = getStoredMatches();
  const newMatch: StoredMatch = {
    id: String(Date.now()),
    ...data,
  };

  saveStoredMatches([newMatch, ...matches]);

  if (approvedRefereeNames.length > 0) {
    const uniqueNames = Array.from(new Set(approvedRefereeNames.filter(Boolean))).slice(0, data.neededRefs);
    const applications = getApplications();
    const createdApplications: Application[] = uniqueNames.map((refereeName, index) => ({
      id: `${Date.now()}-${index}`,
      matchId: newMatch.id,
      refereeName,
      appliedAt: formatNow(),
      status: "approved",
    }));

    saveApplications([...applications, ...createdApplications]);
  }

  return newMatch;
}

export function updateMatch(id: string, data: Omit<StoredMatch, "id">) {
  const matches = getStoredMatches().map((item) =>
    item.id === id
      ? {
          id,
          ...data,
        }
      : item
  );
  saveStoredMatches(matches);
}

export function deleteMatch(id: string) {
  saveStoredMatches(getStoredMatches().filter((item) => item.id !== id));
  saveApplications(getApplications().filter((item) => item.matchId !== id));
}

export function applyToMatch(matchId: string, refereeName: string) {
  const applications = getApplications();
  const existing = applications.find(
    (app) => app.matchId === matchId && app.refereeName === refereeName && app.status !== "rejected"
  );
  if (existing) return existing;

  const created: Application = {
    id: String(Date.now()),
    matchId,
    refereeName,
    appliedAt: formatNow(),
    status: "sent",
  };
  saveApplications([...applications, created]);
  return created;
}

export function cancelApplication(applicationId: string) {
  saveApplications(getApplications().filter((item) => item.id !== applicationId));
}

export function approveApplication(applicationId: string) {
  const applications = getApplications().map((item) =>
    item.id === applicationId ? { ...item, status: "approved" as const } : item
  );
  saveApplications(applications);
}

export function rejectApplication(applicationId: string) {
  const applications = getApplications().map((item) =>
    item.id === applicationId ? { ...item, status: "rejected" as const } : item
  );
  saveApplications(applications);
}

export function getDelegations(): Delegation[] {
  const matches = getMatches();
  const applications = getApplications();

  return matches
    .filter((match) => match.status === "confirmed")
    .map((match) => {
      const approved = applications
        .filter((app) => app.matchId === match.id && app.status === "approved")
        .slice(0, match.neededRefs);

      return {
        id: match.id,
        matchId: match.id,
        date: match.date,
        time: match.time,
        competition: match.competition,
        home: match.home,
        away: match.away,
        location: match.location,
        mainReferee: approved[0]?.refereeName ?? "",
        assistants: approved.slice(1).map((item) => item.refereeName),
      };
    })
    .filter((item) => item.mainReferee);
}
