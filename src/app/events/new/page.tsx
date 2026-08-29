import { createEvent } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function NewEventPage() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Create a new event</CardTitle>
          <CardDescription>
            Give your games day a name. You can add teams and games next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-sm font-medium text-stone-700"
              >
                Event name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Summer Family Games 2026"
                required
                autoFocus
              />
            </div>
            <SubmitButton size="lg">Create event</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
