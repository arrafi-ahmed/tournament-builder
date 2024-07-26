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

-- g_2_4 k_2 g_2_4+s k_2+s s means 2 phases seperated by ' ', each phase either
-- group/knockout/group+single/knockout+single/single
-- g_2_4 = 2 groups each containing 4 teams
-- k_2 = 2 teams will be qualified to knockout stage
-- s = 1 single match
CREATE TABLE tournaments
(
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    type             int CHECK (type IN (5, 6, 7, 8, 11)),
    location         VARCHAR(255),
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    rules            TEXT,
    format_shortcode JSONB, -- {groupCount:2, groupMemberCount:4, knockoutMemberCount: 2}
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organizer_id     INT REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE tournament_phases
(
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255),
    type             VARCHAR(50) CHECK (type IN ('group', 'bracket', 'single_match')),
    --max_teams        INT,
    groups_count     INT,
    teams_per_group  INT,
    qualifying_teams INT,
    phase_order      INT,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id    INT REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE tournament_groups
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255),
    group_order         INT,
    double_round_robin  BOOLEAN,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);

CREATE TABLE group_teams
(
    id                  SERIAL PRIMARY KEY,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_group_id INT REFERENCES tournament_groups (id) ON DELETE CASCADE,
    team_id             INT REFERENCES teams (id)
);

CREATE TABLE tournament_brackets
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255),
    bracket_order       INT,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);

CREATE TABLE rounds
(
    id                  SERIAL PRIMARY KEY,
    round_order         INT,
    name                VARCHAR(255), -- Round of 64/Round of 32/Round of 16/Quarterfinals/Semifinals/Final
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_phase_id INT REFERENCES tournament_phases (id) ON DELETE CASCADE
);

CREATE TABLE matches
(
    id                    SERIAL PRIMARY KEY,
    match_type            VARCHAR(50) CHECK (match_type IN ('group', 'bracket', 'single_match')) NOT NULL,
    tournament_group_id   INT,
    tournament_bracket_id INT,
    round_id              INT,
    start_time            TIMESTAMP,
    home_team_score       INT,
    away_team_score       INT,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    home_team_id          INT REFERENCES teams (id) ON DELETE CASCADE,
    away_team_id          INT REFERENCES teams (id) ON DELETE CASCADE,
    tournament_phase_id   INT REFERENCES tournament_phases (id) ON DELETE CASCADE,
    CONSTRAINT chk_group_phase CHECK (
        (match_type = 'group' AND tournament_group_id IS NOT NULL AND tournament_bracket_id IS NULL AND
         round_id IS NULL) OR
        (match_type = 'bracket' AND tournament_group_id IS NULL AND tournament_bracket_id IS NOT NULL AND
         round_id IS NOT NULL) OR
        (match_type = 'single_match' AND tournament_group_id IS NULL AND tournament_bracket_id IS NULL AND
         round_id IS NULL)
        )
);


CREATE TABLE match_results
(
    id              SERIAL PRIMARY KEY,
    home_team_score INT,
    away_team_score INT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_id        INT REFERENCES matches (id) ON DELETE CASCADE,
    winner_id       INT REFERENCES teams (id) ON DELETE CASCADE
);

CREATE TABLE tournament_invitations
(
    id                SERIAL PRIMARY KEY,
    manager_email     VARCHAR(255) NOT NULL,
    invitation_status VARCHAR(50) CHECK (invitation_status IN ('pending', 'accepted', 'rejected')),
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id     INT REFERENCES tournaments (id) ON DELETE CASCADE,
    team_id           INT REFERENCES teams (id) ON DELETE CASCADE
);

CREATE TABLE team_requests
(
    id             SERIAL PRIMARY KEY,
    request_status VARCHAR(50) CHECK (request_status IN ('pending', 'approved', 'rejected')),
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id  INT REFERENCES tournaments (id) ON DELETE CASCADE,
    team_id        INT REFERENCES teams (id) ON DELETE CASCADE
);


CREATE TABLE subscriptions
(
    id                     SERIAL PRIMARY KEY,
    plan_id                int            NOT NULL,
    stripe_subscription_id varchar(255)   NOT NULL,
    subscription_amount    decimal(10, 2) NOT NULL,
    activation_date        TIMESTAMP      NOT NULL,
    expire_date            TIMESTAMP      NOT NULL,
    active                 BOOLEAN        NOT NULL,
    pending_cancel         BOOLEAN,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organizer_id           INT REFERENCES users (id) ON DELETE CASCADE
);
