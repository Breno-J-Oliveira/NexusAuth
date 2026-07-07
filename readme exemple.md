# 💻 ByteRent — Sistema de Locadora de Eletrônicos com PHP e Bootstrap

<p align="center">
  <img src="https://img.shields.io/badge/Status-FINALIZADO-10B981?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status Finalizado">
  <img src="https://img.shields.io/badge/Versão-1.0-2563EB?style=for-the-badge" alt="Versão 1.0">
  <img src="https://img.shields.io/badge/Projeto-Atividade%20Acadêmica-111827?style=for-the-badge" alt="Projeto Acadêmico">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap">
  <img src="https://img.shields.io/badge/Composer-885630?style=for-the-badge&logo=composer&logoColor=white" alt="Composer">
  <img src="https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white" alt="JSON">
  <img src="https://img.shields.io/badge/OOP-PHP-4F5D95?style=for-the-badge" alt="OOP PHP">
</p>

---

## 📑 Índice

1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Objetivo da Atividade](#-objetivo-da-atividade)
3. [Equipe de Desenvolvimento](#-equipe-de-desenvolvimento)
4. [Principais Funcionalidades](#-principais-funcionalidades)
5. [Tecnologias e Bibliotecas](#-tecnologias-e-bibliotecas)
6. [Pilares da POO Aplicados](#-pilares-da-poo-aplicados)
7. [Estrutura do Projeto](#-estrutura-do-projeto)
8. [Padrão Arquitetural MVC](#-padrão-arquitetural-mvc)
9. [Sistema de Autenticação](#-sistema-de-autenticação)
10. [Equipamentos e Tabela de Preços](#-equipamentos-e-tabela-de-preços)
11. [Interface (UI/UX)](#-interface-uiux)
12. [Requisitos de Execução](#-requisitos-de-execução)
13. [Como Rodar o Projeto](#-como-rodar-o-projeto)
14. [Credenciais de Acesso](#-credenciais-de-acesso)
15. [Observações sobre o vendor e Composer](#-observações-sobre-o-vendor-e-composer)
16. [Contatos e Redes Sociais](#-contatos-e-redes-sociais)

---

## 🎯 Sobre o Projeto

O **ByteRent** é um sistema web completo de locação de equipamentos eletrônicos, desenvolvido inteiramente em **PHP orientado a objetos**, com uma interface moderna e responsiva construída em **Bootstrap 5** com tema Dark personalizado.

A proposta é simular um ambiente real de locadora digital, onde é possível cadastrar equipamentos, controlar disponibilidade, calcular valores de aluguel por diária e gerenciar devoluções — tudo isso com controle de acesso por perfis de usuário.

O projeto foi desenvolvido como atividade acadêmica para o curso de **Técnico em Desenvolvimento de Sistemas** da **Escola SENAI "A. Jacob Lafer"**.

---

## ⚙️ Objetivo da Atividade

O principal objetivo foi consolidar o aprendizado de **Programação Orientada a Objetos (POO) com PHP**, aplicando seus quatro pilares em um sistema funcional com múltiplas camadas de responsabilidade.

### O projeto envolveu:

#### 🔹 Orientação a Objetos Completa
Aplicação dos quatro pilares da POO: **Abstração**, **Encapsulamento**, **Herança** e **Polimorfismo** em um contexto prático e real.

#### 🔹 Interfaces e Classes Abstratas
Definição de contratos de comportamento por meio da interface `Locavel` e da classe abstrata `Eletronico`, garantindo consistência entre todos os tipos de equipamento.

#### 🔹 Namespaces e Autoload PSR-4
Organização do código com namespaces (`Models`, `Services`, `Interfaces`) e carregamento automático de classes via **Composer** seguindo o padrão PSR-4.

#### 🔹 Autenticação com Sessões PHP
Sistema de login com dois perfis distintos (`admin` e `usuario`), senhas armazenadas com **bcrypt** (`password_hash`) e verificação segura com `password_verify`.

#### 🔹 Persistência em JSON
Leitura e escrita de dados em arquivos `.json`, simulando um banco de dados leve e portátil, com persistência de estado após cada operação.

#### 🔹 Interface Responsiva Dark Mode
Construção de uma UI moderna com **Bootstrap 5**, **Bootstrap Icons** e estilos customizados em CSS, priorizando usabilidade e estética.

---

## 🏛️ Principais Funcionalidades

### ✅ Autenticação e Controle de Acesso
- Login seguro com verificação de senha via bcrypt.
- Dois perfis de usuário: **admin** (acesso total) e **usuario** (somente visualização e aluguel).
- Proteção de rotas: páginas só acessíveis após login.
- Logout com destruição de sessão.

### ✅ Gerenciamento de Equipamentos (Admin)
- Cadastro de novos equipamentos com modelo, serial e tipo.
- Exclusão de equipamentos do sistema.
- Suporte a quatro categorias: **Notebook**, **Smartphone**, **Tablet** e **Óculos VR**.

### ✅ Operações de Locação
- Aluguel de equipamentos disponíveis com definição de quantidade de dias.
- Cálculo automático do valor total com base na diária de cada categoria.
- Devolução de equipamentos com atualização de status em tempo real.

### ✅ Filtro por Tipo
- Filtro visual na interface para exibir apenas equipamentos de uma categoria específica.

### ✅ Persistência de Dados
- Todos os dados são salvos automaticamente nos arquivos `Eletronicos.json` e `usuarios.json` a cada operação.
- O sistema mantém o estado mesmo após reinicialização do servidor.

### ✅ Interface Dark Mode
- UI responsiva com tema escuro personalizado.
- Cards de equipamento com badge de status (Disponível / Alugado).
- Feedback de mensagens para todas as operações do sistema.

---

## 🛠 Tecnologias e Bibliotecas

| Tecnologia | Função |
|---|---|
| PHP 7.4+ | Linguagem principal do backend |
| Composer | Gerenciamento de dependências e autoload PSR-4 |
| Bootstrap 5.3 | Framework CSS para UI responsiva |
| Bootstrap Icons 1.11 | Biblioteca de ícones |
| JSON | Formato de persistência de dados |
| Apache / Nginx | Servidor web local (XAMPP, Laragon, etc.) |
| HTML5 + CSS3 | Estrutura e estilização da interface |
| Sessions PHP | Controle de autenticação e estado do usuário |

---

## 🧱 Pilares da POO Aplicados

Esta seção detalha como cada pilar da Programação Orientada a Objetos foi aplicado no projeto.

### 1. 🔵 Abstração
A classe `Eletronico` e a interface `Locavel` representam conceitos abstratos do mundo real — o que é um eletrônico e o que significa ser locável — sem entrar nos detalhes de implementação de cada tipo específico.

```php
// Classe abstrata — define o que todo eletrônico tem em comum
abstract class Eletronico {
    abstract public function calcularAluguel(int $dias): float;
}

// Interface — define o contrato de comportamento locável
interface Locavel {
    public function alugar(): string;
    public function devolver(): string;
    public function isDisponivel(): bool;
}
```

### 2. 🟢 Encapsulamento
Os atributos de `Eletronico` (`$modelo`, `$placa`, `$disponivel`) são declarados como `protected`, acessíveis apenas por meio de métodos públicos controlados (`getModelo()`, `getPlaca()`, `setDisponivel()`).

```php
abstract class Eletronico {
    protected string $modelo;
    protected string $placa;
    protected bool $disponivel;

    public function getModelo(): string { return $this->modelo; }
    public function setDisponivel(bool $disponivel): void {
        $this->disponivel = $disponivel;
    }
}
```

### 3. 🟡 Herança
As quatro classes concretas (`Notebook`, `Smartphone`, `Tablet`, `OculosVR`) herdam de `Eletronico`, reaproveitando os atributos e métodos comuns e implementando apenas o que é específico a cada tipo.

```php
class Notebook extends Eletronico implements Locavel {
    public function calcularAluguel(int $dias): float {
        return $dias * DIARIA_NOTEBOOK; // R$ 100,00/dia
    }
    // Implementações de alugar() e devolver() específicas
}
```

### 4. 🔴 Polimorfismo
O serviço `Locadora` trabalha com o tipo `Locavel` (interface), sem precisar saber qual tipo concreto de eletrônico está sendo manipulado. Cada objeto responde ao mesmo método `calcularAluguel()` de forma diferente.

```php
// Locadora trata todos como Locavel — polimorfismo em ação
/** @var Locavel[] */
private array $veiculos = [];

public function alugarVeiculo(string $modelo, int $dias): string {
    foreach ($this->veiculos as $veiculo) {
        if ($veiculo->getModelo() === $modelo && $veiculo->isDisponivel()) {
            $valor = $veiculo->calcularAluguel($dias); // cada um calcula diferente
            return $veiculo->alugar();
        }
    }
}
```

---

## 🧠 Estrutura do Projeto

```text
byterent/
│
├── config/                    # Configurações do sistema
│   └── config.php             # Constantes: arquivos JSON, valores de diária
│
├── data/                      # Persistência de dados
│   ├── Eletronicos.json       # Equipamentos cadastrados e status
│   └── usuarios.json          # Usuários com senha bcrypt e perfil
│
├── interfaces/                # Contratos de comportamento
│   └── Locavel.php            # Interface com métodos obrigatórios
│
├── models/                    # Entidades do domínio (POO)
│   ├── Eletronico.php         # Classe abstrata base
│   ├── Notebook.php           # Diária: R$ 100,00
│   ├── Smartphone.php         # Diária: R$ 50,00
│   ├── Tablet.php             # Diária: R$ 40,00
│   └── OculosVR.php           # Diária: R$ 80,00
│
├── public/                    # Ponto de entrada da aplicação (web root)
│   ├── index.php              # Controller principal
│   ├── login.php              # Tela e lógica de login
│   └── assets/
│       ├── style.css          # Tema dark customizado
│       └── app.js             # Scripts de interação
│
├── services/                  # Lógica de negócio
│   ├── Auth.php               # Autenticação, sessões e perfis
│   └── Locadora.php           # CRUD de equipamentos, aluguel e devolução
│
├── views/                     # Camada de apresentação
│   └── template.php           # Template HTML principal
│
├── vendor/                    # Gerado pelo Composer (não commitado)
├── composer.json              # Configuração do projeto e autoload PSR-4
└── composer.lock              # Lock de versões das dependências
```

---

## 🏗️ Padrão Arquitetural MVC

O projeto foi estruturado seguindo o padrão **MVC (Model-View-Controller)**, separando responsabilidades de forma clara:

| Camada | Arquivos | Responsabilidade |
|---|---|---|
| **Model** | `models/`, `interfaces/` | Representação dos dados e regras de negócio |
| **View** | `views/template.php`, `public/login.php` | Apresentação e interface com o usuário |
| **Controller** | `public/index.php` | Recebe requisições, orquestra as ações e envia para a View |
| **Service** | `services/Locadora.php`, `services/Auth.php` | Lógica de aplicação reutilizável |

---

## 🔐 Sistema de Autenticação

O sistema de autenticação foi implementado na classe `Auth` com os seguintes recursos:

- **Hashing seguro de senhas** com `password_hash()` usando o algoritmo **bcrypt** (`PASSWORD_DEFAULT`).
- **Verificação segura** com `password_verify()` — nunca comparação direta de strings.
- **Sessões PHP** para manter o estado de autenticação entre requisições.
- **Dois perfis de acesso**:
  - `admin` → pode adicionar, alugar, devolver e deletar equipamentos.
  - `usuario` → pode apenas visualizar e alugar equipamentos.
- **Proteção de rotas**: qualquer acesso não autenticado redireciona para `login.php`.
- **Logout seguro** com `session_destroy()`.

---

## 💰 Equipamentos e Tabela de Preços

| Tipo | Exemplo de Modelo | Diária |
|---|---|---|
| 💻 Notebook | MacBook Pro, Dell XPS, Lenovo ThinkPad | R$ 100,00 |
| 📱 Smartphone | iPhone 15, Samsung Galaxy S24 | R$ 50,00 |
| 📟 Tablet | iPad Pro | R$ 40,00 |
| 🥽 Óculos VR | Meta Quest 3 | R$ 80,00 |

Os valores são configuráveis pelo arquivo `config/config.php` por meio de constantes globais:

```php
define('DIARIA_NOTEBOOK',   100.00);
define('DIARIA_SMARTPHONE',  50.00);
define('DIARIA_TABLET',      40.00);
define('DIARIA_OCULOSVR',    80.00);
```

---

## 🎨 Interface (UI/UX)

A interface foi construída com **Bootstrap 5.3** e um tema dark totalmente customizado via CSS, priorizando clareza e modernidade.

### Características visuais:

#### 🌑 Dark Mode Profundo
- Fundo escuro com alto contraste para melhor legibilidade e menor fadiga visual.

#### 🃏 Cards de Equipamento
- Cada equipamento exibe: ícone gerado com as iniciais do modelo, nome, serial/código, badge de status e ações disponíveis.

#### 🏷️ Badges de Status
- `Disponível` — badge verde, exibe campo de dias e botão "Alugar".
- `Alugado` — badge amarelo/laranja, exibe botão "Devolver".

#### 🔍 Filtro por Tipo
- Select na topbar para filtrar equipamentos por categoria em tempo real.

#### 🔔 Feedback de Mensagens
- Alertas contextuais para todas as operações: cadastro, aluguel, devolução, exclusão e erros de permissão.

#### 👤 Topbar Inteligente
- Exibe o nome do usuário logado com ícone de perfil.
- Botão de logout visível e acessível.
- Formulário de adição de equipamento visível **somente para admins**.

---

## 💻 Requisitos de Execução

Antes de rodar o projeto, certifique-se de ter instalado:

- **PHP 7.4** ou superior
- **Composer** (gerenciador de dependências PHP)
- **Servidor web local**: XAMPP, Laragon, WampServer ou similar (Apache/Nginx)

---

## 🚀 Como Rodar o Projeto

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/seu-usuario/byterent.git
```

---

### 2️⃣ Entre na pasta do projeto

```bash
cd byterent
```

---

### 3️⃣ Instale as dependências via Composer

A pasta `vendor/` não é enviada ao GitHub. Execute:

```bash
composer install
```

Isso irá gerar o `vendor/autoload.php` com o mapeamento PSR-4 dos namespaces.

---

### 4️⃣ Configure o servidor web

Aponte o **document root** do seu servidor (Apache/Nginx) para a pasta `public/` do projeto.

Exemplo com Laragon ou XAMPP:
```
htdocs/byterent/public/
```

---

### 5️⃣ Acesse no navegador

```
http://localhost/byterent/public/login.php
```

---

## 🔑 Credenciais de Acesso

| Usuário | Senha | Perfil | Permissões |
|---|---|---|---|
| `admin` | `admin123` | Administrador | Adicionar, alugar, devolver e deletar equipamentos |
| `usuario` | `user123` | Usuário comum | Visualizar e alugar equipamentos |

> ⚠️ As senhas são armazenadas com **bcrypt** no arquivo `data/usuarios.json`. Nunca em texto puro.

---

## ⚠️ Observações sobre o vendor e Composer

A pasta `vendor/` foi adicionada ao `.gitignore` por ser gerada automaticamente pelo Composer e por conter arquivos específicos de cada ambiente.

Essa é uma prática padrão do mercado que garante:

- Repositório leve e sem arquivos desnecessários.
- Compatibilidade entre diferentes sistemas operacionais.
- Instalação limpa e consistente das dependências.

Todas as dependências são recriadas com:

```bash
composer install
```

O arquivo `composer.json` define o autoload PSR-4 dos namespaces:

```json
{
    "autoload": {
        "psr-4": {
            "Interfaces\\": "interfaces/",
            "Models\\":     "models/",
            "Services\\":   "services/"
        }
    }
}
```

---

## 🤝 Contatos e Redes Sociais

<p align="center">
  <a href="https://github.com/Breno-J-Oliveira" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white">
  </a>
  <a href="https://www.linkedin.com/in/breno-j-oliveira-672619352/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white">
  </a>
  <a href="https://www.instagram.com/brenoov" target="_blank">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white">
  </a>
  <a href="https://x.com/BrenoJOliveira_" target="_blank">
    <img src="https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white">
  </a>
</p>

---

## 🏁 Conclusão Final

O **ByteRent** é um sistema que demonstra, na prática, como os princípios da Programação Orientada a Objetos com PHP podem ser aplicados para construir uma aplicação web completa, organizada e escalável.

O projeto integra:

- POO com os quatro pilares aplicados de forma real
- Arquitetura MVC com separação clara de responsabilidades
- Autenticação segura com bcrypt e sessões PHP
- Persistência de dados com JSON
- Interface moderna e responsiva com Bootstrap 5

A aplicação pode evoluir para:

- Integração com banco de dados relacional (MySQL/PostgreSQL)
- API REST para consumo por aplicativos mobile
- Relatórios de locações e histórico por usuário
- Sistema de pagamento integrado

---
