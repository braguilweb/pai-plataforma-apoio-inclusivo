import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminAvatars() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Configurar Avatares</h1>
          <Button variant="outline" onClick={() => setLocation("/super-admin/dashboard")}>
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Mangá</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-32 h-32 bg-gray-200 rounded-lg mb-4"></div>
              <Button className="w-full" variant="outline">
                Editar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pixar 3D</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-32 h-32 bg-gray-200 rounded-lg mb-4"></div>
              <Button className="w-full" variant="outline">
                Editar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Robô Android</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-32 h-32 bg-gray-200 rounded-lg mb-4"></div>
              <Button className="w-full" variant="outline">
                Editar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
