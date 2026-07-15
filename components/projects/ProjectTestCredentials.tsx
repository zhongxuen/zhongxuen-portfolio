interface TestCredential {
        role: string;
        username: string;
        password: string;
    }

    interface ProjectTestCredentialsProps {
        credentials: TestCredential[];
    }

    export function ProjectTestCredentials({ credentials }: ProjectTestCredentialsProps) {
        return (
            <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted">Test Accounts</h3>
                <div className="space-y-1">
                    {credentials.map((cred) => (
                        <div key={cred.role} className="text-sm">
                            <span className="text-muted">{cred.role}:</span>{" "}
                            <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs">
                                {cred.username}
                            </code>{" "}
                            /{" "}
                            <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs">
                                {cred.password}
                            </code>
                        </div>
                    ))}
                </div>
            </div>
        );
    }