CREATE TABLE users
(
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255)        NOT NULL,
    name       VARCHAR(255),
    role       VARCHAR(50)         NOT NULL CHECK (role IN ('sudo', 'organizer', 'team_manager')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams
(
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    age_group  VARCHAR(50) CHECK (age_group IN ('under_18', 'open', 'adult')),
    logo       VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    manager_id INT          REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE team_members
(
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(255) NOT NULL,
    status   VARCHAR(255) CHECK (status IN ('starting', 'substitute')),
    category VARCHAR(255) CHECK (category IN ('goalkeeper', 'defender', 'midfielder', 'forward', 'coaching_stuff')),
    team_id  INT REFERENCES teams (id) ON DELETE CASCADE
);

-- entity_last_count = {phase:1, group:1, bracket:1, match:1}
CREATE TABLE tournaments
(
    id                  SERIAL PRIMARY KEY,
    slug                VARCHAR(255) UNIQUE NOT NULL,  -- added
    name                VARCHAR(255) NOT NULL,
    type                int CHECK (type IN (5, 6, 7, 8, 11)),
    location            VARCHAR(255),
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    rules               TEXT,
    entity_last_count   JSONB,
    match_duration      int       DEFAULT 90,
    match_interval_time int       DEFAULT 30,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organizer_id        INT REFERENCES users (id) ON DELETE CASCADE
);
alter table tournaments
    add column slug VARCHAR(255) UNIQUE;

CREATE TABLE teams_tournaments
(
    id            SERIAL PRIMARY KEY,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_id       INT REFERENCES teams (id) ON DELETE CASCADE,
    tournament_id INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE tournament_phases
(
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255),
    "order"       INT,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE tournament_brackets
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255),
    "order"             INT,
    teams_count         INT,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);

CREATE TABLE tournament_groups
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255),
    ranking_published   BOOLEAN,
    "order"             INT,
    teams_per_group     INT,
    double_round_robin  BOOLEAN,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);
-- #future_team_reference:
-- {type:group, id:1, position:2}
-- {type:match, id:1, position:0}
-- position 1 = winner, position 2 = loser

-- in format use group_teams->future_team_reference as ref temporarily, while making schedule replace
-- match->future_team_reference
-- with related group_teams->future_team_reference
CREATE TABLE groups_teams
(
    id                  SERIAL PRIMARY KEY,
    team_ranking        INT,
    tournament_group_id INT REFERENCES tournament_groups (id) ON DELETE CASCADE,
    team_id             INT REFERENCES teams (id),
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups_teams_stats
(
    id              SERIAL PRIMARY KEY,
    played          INT,
    won             INT,
    draw            INT,
    lost            INT,
    points          INT,
    goals_for       INT,
    goals_away      INT,
    goal_difference INT,
    groups_teams_id INT REFERENCES groups_teams (id) ON DELETE CASCADE,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE match_days
(
    id            SERIAL PRIMARY KEY,
    match_date    DATE not null,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE fields
(
    id            SERIAL PRIMARY KEY,
    name          varchar(255) not null,
    start_time    time         not null,
    field_order   int,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id INT REFERENCES tournaments (id) ON DELETE CASCADE
);

-- #host_id:
-- host can be group/bracket/single match based on match_type,
-- match_type = group -> host id = group_id
-- match_type = bracket -> host id = match_id
-- match_type = single_match -> host id = phase_id

-- #future_team_reference:
-- {home:{type:'group', id:1, position:2}, away:{type:'group', id:2, position:4}}
-- {home:{type:'match', id:1, position:0}, away:{type:'match', id:2, position:1}}
-- for match position 1 = winner, position 2 = loser

--group_team_reference:
-- {home:{group_team_id:1}, away:{group_team_id:2}}

-- #round_type
-- 0=final, 1=semi final
CREATE TABLE matches
(
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(255),
    "order"               INT,
    type                  VARCHAR(50) CHECK (type IN ('group', 'bracket', 'single_match')),
    round_type            INT,
    start_time            TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    home_team_id          INT REFERENCES teams (id) ON DELETE CASCADE,
    away_team_id          INT REFERENCES teams (id) ON DELETE CASCADE,
    phase_id              INT REFERENCES tournament_phases (id) ON DELETE CASCADE,   -- used in match
    group_id              INT REFERENCES tournament_groups (id) ON DELETE CASCADE,   -- used in groups
    bracket_id            INT REFERENCES tournament_brackets (id) ON DELETE CASCADE, -- used in brackets
    future_team_reference JSONB,
    group_team_reference  JSONB,
    match_day_id          INT                                                              REFERENCES match_days (id) ON DELETE SET NULL,
    field_id              INT                                                              REFERENCES fields (id) ON DELETE SET NULL,
    tournament_id         INT REFERENCES tournaments (id)
);

CREATE TABLE match_results
(
    id              SERIAL PRIMARY KEY,
    home_team_score INT,
    away_team_score INT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_id        INT UNIQUE REFERENCES matches (id) ON DELETE CASCADE,
    winner_id       INT REFERENCES teams (id) ON DELETE CASCADE
);

--sent by team_manager
-- status: rejected = 0, accepted = 1, pending = 2
CREATE TABLE team_requests
(
    id             SERIAL PRIMARY KEY,
    request_status int CHECK (request_status IN (0, 1, 2)),
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id  INT REFERENCES tournaments (id) ON DELETE CASCADE,
    team_id        INT REFERENCES teams (id) ON DELETE CASCADE
);

CREATE TABLE subscription
(
    id                     SERIAL PRIMARY KEY,
    plan_id                int            NOT NULL,
    stripe_subscription_id varchar(255)   NOT NULL,
    subscription_amount    decimal(10, 2) NOT NULL,
    activation_date        TIMESTAMP      NOT NULL,
    expire_date            TIMESTAMP,
    active                 BOOLEAN        NOT NULL,
    pending_cancel         BOOLEAN,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id                INT REFERENCES users (id) ON DELETE CASCADE, -- ref organizer
    tournament_id          INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE subscription_plan
(
    id      SERIAL PRIMARY KEY,
    title   varchar(255) NOT NULL,
    tagline varchar(255),
    price   decimal(10, 2)
);

ALTER TABLE teams_tournaments
    ADD CONSTRAINT unique_team_tournament
        UNIQUE (team_id, tournament_id);
