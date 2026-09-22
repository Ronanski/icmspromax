# ICMS ProMax (LPDSI Limay 1)

Isang web-based management system na ginawa para sa tracking, scheduling, at monitoring ng Corrective at Preventive Maintenance sa plant environment.

---

## 📌 Pangunahing Features

* **Today's Focus Dashboard**: Mabilisang breakdown ng shift status kabilang ang Scheduled, Break-In, In-Progress, at Completed jobs.
* **Work Order Management**: Pagsusubaybay sa mga corrective work orders, priority level, equipment tag, target date, at nakatagtalagang manpower.
* **Break-In Hub**: Pag-capture at pag-log ng mga unplanned, emergency, o break-in jobs nang hindi agad nangangailangan ng official WO number.
* **Notification Center**: Real-time at persistent alert system gamit ang Supabase para sa mga overdue PMs, low stock inventory, at bagong trabaho.
* **Master Data Hub**: Centralized registry para sa Item Master (spare parts/inventory) at System Registry.
* **Shift Reports & Daily Logs**: Mabilisang pag-generate ng CM Shift Reports at pag-monitor ng daily accomplishment logs para sa supervisor.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + Shadcn UI
* **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Realtime Sync)
* **Deployment**: Vercel

---

## 🚀 Local Development Setup

1. **I-clone ang repository**:
   ```bash
   git clone [https://github.com/Ronanski/icmspromax.git](https://github.com/Ronanski/icmspromax.git)
   cd icmspromax
