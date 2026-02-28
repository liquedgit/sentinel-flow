import { EyeOff, Eye, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export enum SidebarAgentType {
  SidebarAgentTypeCREATE = "CREATE",
  SidebarAgentTypeEDIT = "EDIT",
}

export default function AgentsPage() {
  const [openType, setOpenedType] = useState<SidebarAgentType | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Form state for CREATE mode
  const [step, setStep] = useState(1);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    agentName: "production-collector-01",
    identityEndpoint: "https://identity.sentinelflow.io",
    backendBaseUrl: "https://api.sentinelflow.io",
    agentToken: "sf_live_51H8m...xYz123Abc789",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderCreateForm = () => {
    return (
      <div className="space-y-6">
        {/* Agent Name */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">Agent Name</label>
          <Input
            value={formData.agentName}
            onChange={(e) => handleInputChange("agentName", e.target.value)}
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
          />
          <p className="text-gray-400 text-xs">
            Assign a unique name for identification in the dashboard.
          </p>
        </div>

        {/* Identity Endpoint */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">
            Identity Endpoint
          </label>
          <Input
            value={formData.identityEndpoint}
            onChange={(e) =>
              handleInputChange("identityEndpoint", e.target.value)
            }
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
          />
          <p className="text-gray-400 text-xs">
            The Endpoint where the agent will fetch user identities.
          </p>
        </div>

        {/* Backend Base URL */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">
            Backend Base URL
          </label>
          <Input
            value={formData.backendBaseUrl}
            onChange={(e) =>
              handleInputChange("backendBaseUrl", e.target.value)
            }
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
          />
          <p className="text-gray-400 text-xs">
            Service backend base url for Reverse Proxy
          </p>
        </div>
      </div>
    );
  };

  const renderDetailAgentPage = () => {
    return (
      <Sheet open={openType != null} onOpenChange={() => setOpenedType(null)}>
        <SheetContent
          className="bg-primary-foreground border-primary  flex flex-col h-full"
          showCloseButton={false}
          side="right"
        >
          <div className="flex-shrink-0 border-b border-primary">
            <SheetHeader>
              <SheetTitle className="text-white">
                {openType == SidebarAgentType.SidebarAgentTypeCREATE ? (
                  <>Deploy New Agent</>
                ) : (
                  <>
                    {openType == SidebarAgentType.SidebarAgentTypeEDIT &&
                      selectedAgent != null && <>{selectedAgent}</>}
                  </>
                )}
              </SheetTitle>
              {openType == SidebarAgentType.SidebarAgentTypeEDIT &&
                selectedAgent != null && (
                  <>
                    <SheetDescription>
                      <div className="font-bold">ID : adadada</div>
                    </SheetDescription>
                  </>
                )}
            </SheetHeader>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="text-white space-y-4">
              <div className="p-6">
                {openType === SidebarAgentType.SidebarAgentTypeCREATE &&
                  renderCreateForm()}
                {openType === SidebarAgentType.SidebarAgentTypeEDIT && (
                  <div className="text-white">Edit form content here</div>
                )}
              </div>
            </div>
          </ScrollArea>
          {/* Footer Actions */}
          {openType === SidebarAgentType.SidebarAgentTypeCREATE && (
            <div className="flex-shrink-0 p-6">
              <Button
                className="w-full bg-active-primary hover:bg-active-primary/50 text-white font-medium py-3 rounded-lg transition-colors"
                onClick={() => {
                  // Handle generate installation command
                  console.log("Generating installation command...", formData);
                }}
              >
                Generate Installation Command
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="p-4 space-y-5">
      {/* Headings */}
      <div className="flex justify-between">
        <div className="space-x-2">
          <h1 className="text-white font-bold text-2xl">Managed Agents</h1>
          <p>
            Centralized control for data collection across your legacy
            infrastructure.
          </p>
        </div>
        <div>
          <Button
            className="bg-active-primary hover:bg-active-primary/50 text-white"
            onClick={() =>
              setOpenedType(SidebarAgentType.SidebarAgentTypeCREATE)
            }
          >
            Deploy New Agent
          </Button>
        </div>
      </div>
      {/* Body */}
      <div className="space-y-4">
        {/* Filter and Search */}
        <div>
          <div className="w-1/4">
            <Input
              placeholder="Search agents by name, ID, or IP address"
              className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-primary">
          <Table className="bg-primary-foreground text-white">
            <TableHeader>
              <TableRow className="hover:bg-active-primary-foreground">
                <TableHead>Agent ID</TableHead>
                <TableHead>Agent name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Heartbeat</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody></TableBody>
          </Table>
        </div>
        {renderDetailAgentPage()}
      </div>
    </div>
  );
}
