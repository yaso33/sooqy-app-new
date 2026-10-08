-- جدول الإشعارات: إشعارات حقيقية للمستخدمين (تحديثات الطلبات، عروض، إلخ)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info' check (type in ('info', 'order', 'offer', 'reservation', 'system')),
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read = false;

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Users mark own notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Trigger: عند تغيّر حالة الطلب، أنشئ إشعارًا لصاحب الطلب
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'order',
      'تحديث حالة طلبك',
      case new.status
        when 'confirmed' then 'تم تأكيد طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'shipped' then 'تم شحن طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'delivered' then 'تم توصيل طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'cancelled' then 'تم إلغاء طلبك رقم ' || substr(new.id::text, 1, 8)
        else 'تغيّرت حالة طلبك إلى ' || new.status
      end,
      jsonb_build_object('order_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status
after update of status on public.orders
for each row execute function public.notify_order_status();

-- Trigger: عند تغيّر حالة الحجز، أنشئ إشعارًا لصاحب الحجز
create or replace function public.notify_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'reservation',
      'تحديث حالة حجزك',
      case new.status
        when 'collected' then 'تم استلام حجزك بنجاح'
        when 'cancelled' then 'تم إلغاء حجزك'
        when 'expired' then 'انتهت صلاحية حجزك'
        else 'تغيّرت حالة حجزك إلى ' || new.status
      end,
      jsonb_build_object('reservation_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_notify_status on public.reservations;
create trigger reservations_notify_status
after update of status on public.reservations
for each row execute function public.notify_reservation_status();
