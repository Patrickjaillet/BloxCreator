; Blox Creator - Inno Setup 7 installer script (spec 12)
; Alternative Windows distribution to the native Tauri NSIS/MSI bundlers,
; with a custom installer icon, Start Menu shortcut and a clean uninstaller.
;
; Keep #AppVersion in sync with src-tauri/Cargo.toml's `version` field
; (single source of truth per spec 17) before cutting a release build.

#define AppName "Blox Creator"
#define AppVersion "1.0.0"
#define AppPublisher "Patrick JAILLET"
#define AppPublisherURL "https://patrickjaillet.github.io/sandefjord-software"
#define AppExeName "bloxcreator.exe"

[Setup]
AppId={{6C6A2C6E-6B0D-4E9E-9C3B-6B7A6F1B0F3A}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppPublisherURL}
AppSupportURL={#AppPublisherURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=BloxCreator-Setup-{#AppVersion}
SetupIconFile=..\src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#AppExeName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\src-tauri\target\release\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

; The uninstaller only removes files it installed under {app}. The user's
; blox_creator.db and app settings in %APPDATA% are intentionally left
; untouched so uninstalling never causes data loss.
