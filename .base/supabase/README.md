# SOOQY Supabase backend setup

This folder contains the backend foundation for the SOOQY application.

## Local setup

1. Install Supabase CLI.
2. Run the project from the repo root:

```bash
supabase login
supabase start
supabase db reset
```

3. Apply the schema from the migration folder:

```bash
supabase db push
```

4. Start the local studio:

```bash
supabase studio
```

## Required environment variables

Copy `.env.example` to a local `.env` and fill the values for your Supabase project.

## Main objects

- `profiles`
- `user_roles`
- `stores`
- `products`
- `store_offers`
- `product_images`
- `reviews`
- `reservations`
- `orders`
- `order_items`
- `wilayas`

The setup follows the current SOOQY app flow: customer, merchant, reservation, order, and review management.
