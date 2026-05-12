import { unstable_cache } from "next/cache";
import { basePrisma } from "@/lib/prisma-core";
import { getCurrentShopId } from "@/lib/shop";
import HomeClient, { type HomeReview } from "./HomeClient";

const getHomeReviews = unstable_cache(
  async (shopId: string) =>
    basePrisma.review.findMany({
      where: {
        shopId,
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
    }),
  ["home-reviews"],
  {
    revalidate: 300,
  }
);

const getHomeImages = unstable_cache(
  async (shopId: string) =>
    basePrisma.homeImage.findMany({
      where: {
        shopId,
        isActive: true,
      },
      select: {
        imageUrl: true,
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
  ["home-images"],
  {
    revalidate: 300,
  }
);

export default async function HomePage() {
  const shopId = await getCurrentShopId();
  const [reviews, images] = await Promise.all([
    getHomeReviews(shopId),
    getHomeImages(shopId),
  ]);

  const homeReviews: HomeReview[] = reviews.slice(0, 3).map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    customerName: review.customer.name || "Cliente",
  }));

  return (
    <HomeClient
      reviews={homeReviews}
      hasMoreReviews={reviews.length > 3}
      homeImages={images.map((image) => image.imageUrl).filter(Boolean)}
    />
  );
}
