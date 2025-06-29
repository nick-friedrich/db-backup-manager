import Elysia from "elysia";



export const blogController = new Elysia({ name: "blog" }).get("/blog/:id", ({ params }) => {
  return {
    message: `Blog post ID ${params.id}`,
  };
});