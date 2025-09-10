## Directions Module (NestJS) — Rules and Conventions

### 1. Purpose
- **Goal**: Manage medical directions (skill groups) that aggregate certificate types.
- **Scope**: CRUD for directions and many-to-many linking to certificate types.

### 2. Tech Context
- **Runtime**: Node.js v20.x, TypeScript 5.x
- **Framework**: NestJS 11
- **ORM**: TypeORM 0.3.x + PostgreSQL
- **Validation**: class-validator + class-transformer with global `ValidationPipe`
- **Docs**: @nestjs/swagger


### 3. Data Model (TypeORM Entity)
- File: `src/directions/entities/direction.entity.ts`
- Table: `directions`
- Fields:
  - `id: uuid` — primary key
  - `name: varchar(120)` — required, unique, indexed
  - `slug: varchar(120)` — required, unique, indexed
  - `description?: varchar(300)` — optional
  - `createdAt: timestamp` — auto
  - `updatedAt: timestamp` — auto
- Relations:
  - `ManyToMany(Direction <-> CertificateType)` via join table `direction_certificate_types`

### 4. DTOs and Validation
- Files:
  - `src/directions/dto/create-direction.dto.ts`
  - `src/directions/dto/update-direction.dto.ts`
- Rules:
  - Create:
    - `name: string, 2..120`
    - `slug: string, 2..120`
    - `description?: string, 0..300`
    - `certificateTypeIds?: string[] (uuid)` — optional, to set initial links
  - Update: `PartialType(CreateDirectionDto)`
    - If `certificateTypeIds` provided, replaces the entire relation set

### 5. Service Behavior
- File: `src/directions/directions.service.ts`
- Use `Repository<Direction>` and `Repository<CertificateType>`.
- Methods:
  - `create(dto)` → create + optionally link certificate types; save
  - `findAll()` → list with `certificateTypes` relation, order `createdAt DESC`
  - `findOne(id)` → load with `certificateTypes`; 404 if missing
  - `update(id, dto)` → merge fields; if `certificateTypeIds` present, replace links
  - `remove(id)` → delete after existence check

### 6. Controller & API
- File: `src/directions/directions.controller.ts`
- Decorators: `@ApiTags('directions')`
- Routes:
  - `POST /directions` — create direction (accepts `certificateTypeIds`)
  - `GET /directions` — list directions with relations
  - `GET /directions/:id` — get by id
  - `PATCH /directions/:id` — update; replace links if `certificateTypeIds` provided
  - `DELETE /directions/:id` — delete

### 7. Module Wiring
- File: `src/directions/directions.module.ts`
- `imports: [TypeOrmModule.forFeature([Direction, CertificateType])]`
- Export `DirectionsService` if needed elsewhere.
- App integration: `DirectionsModule` is imported in `src/app.module.ts`.

### 8. Conventions & Constraints
- Keep `slug` stable and unique.
- Replace-not-merge behavior when arrays of relation IDs are provided in update.
- Error messages concise (e.g., `Direction not found`).

### 9. Key Files & Paths
- `src/directions/entities/direction.entity.ts`
- `src/directions/dto/create-direction.dto.ts`
- `src/directions/dto/update-direction.dto.ts`
- `src/directions/directions.service.ts`
- `src/directions/directions.controller.ts`
- `src/directions/directions.module.ts`
- App registration: `src/app.module.ts`


