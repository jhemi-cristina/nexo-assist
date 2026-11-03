import { db } from "../../lib/db";

export async function searchArticles(query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const articles = await db.helpArticle.findMany({
    where: {
      OR: terms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" } },
        { content: { contains: term, mode: "insensitive" } },
      ]),
    },
    take: 3,
  });

  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    tags: a.tags,
  }));
}
