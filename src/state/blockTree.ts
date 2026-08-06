import type { BlockDto, CategoryDto, GenreTreeDto } from "../types/dto";

export interface GenreGroup {
  genre: GenreTreeDto;
  uncategorizedBlocks: BlockDto[];
  categories: { category: CategoryDto; blocks: BlockDto[] }[];
}

export function groupBlocksByGenre(genres: GenreTreeDto[], blocks: BlockDto[]): GenreGroup[] {
  const sortedGenres = [...genres].sort((a, b) => a.displayOrder - b.displayOrder);

  return sortedGenres.map((genre) => {
    const uncategorizedBlocks = blocks.filter(
      (block) => block.genreId === genre.id && block.categoryId === null,
    );
    const sortedCategories = [...genre.categories].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    const categories = sortedCategories.map((category) => ({
      category,
      blocks: blocks.filter((block) => block.categoryId === category.id),
    }));
    return { genre, uncategorizedBlocks, categories };
  });
}
