import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ------------------------------------------------------------------ */
/*  GitHub helpers                                                     */
/* ------------------------------------------------------------------ */

interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  twitter_username: string | null;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

async function fetchGitHub(url: string): Promise<{
  profile: GitHubProfile | null;
  topRepos: GitHubRepo[];
}> {
  const username = extractGitHubUsername(url);
  if (!username) return { profile: null, topRepos: [] };

  const token = Deno.env.get("GITHUB_TOKEN");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(
        `https://api.github.com/users/${username}/repos?sort=stars&per_page=5&type=owner`,
        { headers },
      ),
    ]);

    const profile: GitHubProfile | null = profileRes.ok
      ? await profileRes.json()
      : null;
    const repos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];
    const topRepos = repos.filter((r) => !r.fork).slice(0, 5);

    return { profile, topRepos };
  } catch {
    return { profile: null, topRepos: [] };
  }
}

function extractGitHubUsername(url: string): string | null {
  try {
    const u = new URL(
      url.startsWith("http") ? url : `https://github.com/${url}`,
    );
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return url.trim().replace(/^@/, "") || null;
  }
}

/* ------------------------------------------------------------------ */
/*  Exa.ai search                                                     */
/* ------------------------------------------------------------------ */

interface ExaResult {
  title: string;
  url: string;
  text?: string;
}

async function searchExa(
  name: string,
  company: string | undefined,
  city: string,
  linkedinUrl: string | undefined,
): Promise<ExaResult[]> {
  const key = Deno.env.get("EXA_API_KEY");
  if (!key) return [];

  // Build a rich query — name + company + "founder OR CEO OR CTO" to find professional context
  const query = [
    `"${name}"`,
    company ? `"${company}"` : undefined,
    "founder OR CEO OR CTO OR builder OR creator",
  ].filter(Boolean).join(" ");

  try {
    // Run main search + optional LinkedIn content fetch in parallel
    const searches: Promise<ExaResult[]>[] = [];

    // Deep search for the person
    searches.push(
      fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          numResults: 10,
          type: "deep",
          contents: { text: { maxCharacters: 2000 } },
        }),
      }).then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results ?? []).map((r: any) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          text: r.text ?? "",
        }));
      }).catch(() => [] as ExaResult[])
    );

    // If LinkedIn URL provided, fetch that page's content directly
    if (linkedinUrl) {
      searches.push(
        fetch("https://api.exa.ai/contents", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            urls: [linkedinUrl],
            text: { maxCharacters: 3000 },
          }),
        }).then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return (data.results ?? []).map((r: any) => ({
            title: r.title ?? "LinkedIn profile",
            url: r.url ?? linkedinUrl,
            text: r.text ?? "",
          }));
        }).catch(() => [] as ExaResult[])
      );
    }

    const allResults = await Promise.all(searches);
    return allResults.flat();
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  OpenAI bio generation                                              */
/* ------------------------------------------------------------------ */

async function generateBio(context: {
  name: string;
  email: string;
  city: string;
  company?: string;
  comment?: string;
  aiProfile?: string;
  githubProfile: GitHubProfile | null;
  topRepos: GitHubRepo[];
  exaResults: ExaResult[];
}): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return fallbackBio(context.name, context.city);

  const sections: string[] = [];

  sections.push(
    `Name: ${context.name}\nCity: ${context.city}\nEmail: ${context.email}`,
  );
  if (context.company) sections.push(`Company: ${context.company}`);
  if (context.comment)
    sections.push(`Their reason for wanting to organize:\n${context.comment}`);

  if (context.githubProfile) {
    const g = context.githubProfile;
    sections.push(
      `GitHub profile:\n- Bio: ${g.bio ?? "N/A"}\n- Company: ${g.company ?? "N/A"}\n- Location: ${g.location ?? "N/A"}\n- Public repos: ${g.public_repos}\n- Followers: ${g.followers}`,
    );
  }

  if (context.topRepos.length > 0) {
    const repoList = context.topRepos
      .map(
        (r) =>
          `  - ${r.name} (${r.language ?? "?"}, ${r.stargazers_count}★): ${r.description ?? ""}`,
      )
      .join("\n");
    sections.push(`Top repositories:\n${repoList}`);
  }

  if (context.exaResults.length > 0) {
    const webList = context.exaResults
      .map((r) => `  - ${r.title} (${r.url})\n    ${r.text ?? ""}`)
      .join("\n");
    sections.push(`Web search results about this person:\n${webList}`);
  }

  if (context.aiProfile) {
    sections.push(`AI-generated profile (provided by applicant via ChatGPT/Claude):\n${context.aiProfile}`);
  }

  const userMessage = sections.join("\n\n");

  const systemPrompt =
    "You are a writer for Cafe2035, a global community where founders, artists, scientists, and builders gather to share 5-minute stories about what the world looks like in 2035. " +
    "Write a compelling 2-3 sentence bio (under 80 words) explaining why this person would make an excellent Cafe2035 organizer in their city. " +
    "Be warm, specific, and reference their actual background, projects, or interests when available. " +
    "If limited info is available, be gracious and focus on their stated motivation. " +
    "Do NOT use clichés like 'passionate about' or 'dedicated to'. Write with energy and specificity.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        max_completion_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) return fallbackBio(context.name, context.city);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? fallbackBio(context.name, context.city);
  } catch {
    return fallbackBio(context.name, context.city);
  }
}

function fallbackBio(name: string, city: string): string {
  return `${name} wants to bring Cafe2035 to ${city} — and we love that. We're reviewing their application and will be in touch soon.`;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { name, email, city, company, github_url, linkedin_url, ai_profile, comment } =
      body;

    // Validate required fields
    if (!name || !email || !city) {
      return new Response(
        JSON.stringify({ error: "name, email, and city are required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // 0. If ai_profile looks like a URL, fetch its content
    let resolvedAiProfile = ai_profile;
    if (ai_profile && /^https?:\/\//i.test(ai_profile.trim())) {
      try {
        const pageRes = await fetch(ai_profile.trim());
        if (pageRes.ok) {
          const html = await pageRes.text();
          // Strip HTML tags to get plain text
          const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          if (text.length > 50) resolvedAiProfile = text.slice(0, 10000);
        }
      } catch {
        // Keep the original URL as fallback
      }
    }

    // 1. Fetch GitHub data (parallel with Exa)
    const [githubData, exaResults] = await Promise.all([
      github_url
        ? fetchGitHub(github_url)
        : Promise.resolve({ profile: null, topRepos: [] as GitHubRepo[] }),
      searchExa(name, company, city, linkedin_url),
    ]);

    // 2. Generate bio with Claude
    const bio = await generateBio({
      name,
      email,
      city,
      company,
      comment,
      aiProfile: resolvedAiProfile,
      githubProfile: githubData.profile,
      topRepos: githubData.topRepos,
      exaResults,
    });

    // 3. Store in Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("applications")
      .insert({
        name,
        email,
        city,
        company: company || null,
        github_url: github_url || null,
        linkedin_url: linkedin_url || null,
        ai_profile: resolvedAiProfile || null,
        comment: comment || null,
        search_data: {
          github: githubData.profile
            ? {
                profile: githubData.profile,
                topRepos: githubData.topRepos,
              }
            : null,
          exa: exaResults,
        },
        generated_bio: bio,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save application" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ bio, applicationId: data.id }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
