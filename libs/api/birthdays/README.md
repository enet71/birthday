# api-birthdays

`/api/birthdays`: the signed-in user's birthdays.

| Request                     | Answer                                                                  |
| --------------------------- | ----------------------------------------------------------------------- |
| `GET /api/birthdays`        | `BirthdayDto[]` in the order they were added                            |
| `POST /api/birthdays`       | 201 and the created `BirthdayDto`                                       |
| `PATCH /api/birthdays/:id`  | The updated `BirthdayDto`; 404 for a missing or another user's birthday |
| `DELETE /api/birthdays/:id` | 204, also when the birthday is already gone                             |

The request bodies are the `CreateBirthdayRequest` and `UpdateBirthdayRequest` of `@birthday/shared-models`. The zod
schemas in `src/lib/schemas` apply the same limits as the database checks and reject unknown fields, such as the
Google links, which only the Google sync sets. A body that fails them is answered with 400 by the API's
`ZodExceptionFilter`.

Every query filters by the signed-in user: the API has no row-level security.
