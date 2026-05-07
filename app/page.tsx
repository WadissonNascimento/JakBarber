import { prisma } from "@/lib/prisma";
import HomeClient, { type HomeReview } from "./HomeClient";

export default async function HomePage() {
  const reviews = await prisma.review.findMany({
    where: {
      isVisible: true,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      customer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
  });

  const homeReviews: HomeReview[] = reviews.slice(0, 3).map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    customerName: review.customer.name || "Cliente",
  }));

  return <HomeClient reviews={homeReviews} hasMoreReviews={reviews.length > 3} />;
}
