-- 0015_archivado_en.sql — Sello de archivado formal sobre el trámite.
--
-- Gestión de Desvinculaciones: "ARCHIVADO" no es un estado nuevo, es una columna
-- ortogonal sobre `funcionarios`, solo asignable cuando el trámite ya está en
-- PAZ_Y_SALVO. El módulo /archivo ya trata ese estado como cerrado/solo-lectura;
-- esto añade el sello temporal de archivado formal, con un trigger de defensa en
-- profundidad (la guarda real vive en el caso de uso `archivarCaso`).

alter table funcionarios add column if not exists archivado_en timestamptz;

create or replace function fn_archivado_en_requiere_paz_y_salvo()
returns trigger as $$
begin
  if new.archivado_en is not null and new.estado_global <> 'PAZ_Y_SALVO' then
    raise exception 'archivado_en solo puede asignarse cuando estado_global = PAZ_Y_SALVO';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_archivado_en_requiere_paz_y_salvo on funcionarios;
create trigger trg_archivado_en_requiere_paz_y_salvo
  before insert or update on funcionarios
  for each row execute function fn_archivado_en_requiere_paz_y_salvo();
